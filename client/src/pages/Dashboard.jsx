import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MapPin, Clock, ChevronRight, Bell, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { reportAPI, notificationAPI, messageAPI } from '@/services/api';
import ReportStatus from '../components/ReportStatus';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = 'http://localhost:3000';

const getImageUrl = (photoPath) => {
  if (!photoPath) return '';
  if (photoPath.startsWith('http')) return photoPath;
  return `${API_BASE_URL}${photoPath}`;
};

const handleImageError = (e) => {
  e.target.style.display = 'none';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [unreadChatCounts, setUnreadChatCounts] = useState({}); // { reportId: unreadCount }

  // FIX: Logica indirizzo migliorata per gestire parchi, cimiteri e aree senza via specifica
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();
      
      // 1. Prova a costruire un indirizzo breve (Via + Civico)
      const road = data.address?.road || data.address?.pedestrian || data.address?.street || "";
      const houseNumber = data.address?.house_number || "";
      let formattedAddress = `${road} ${houseNumber}`.trim();

      // 2. Se vuoto, usa il nome del luogo (es. "Cimitero Monumentale") o il nome visualizzato completo
      if (!formattedAddress) {
        // data.name contiene spesso il nome del POI (Point of Interest)
        // data.display_name contiene l'indirizzo completo
        formattedAddress = data.name || data.display_name || "Address not available";
      }
      
      // Pulizia opzionale: se il display_name è lunghissimo, prendiamo solo le prime parti? 
      // Per ora lasciamo l'indirizzo completo come richiesto dall'utente.
      return formattedAddress;
    } catch (error) {
      console.error("Error fetching address:", error);
      return "Address not available";
    }
  };

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        setLoading(true);
        const response = await reportAPI.getAll();
        const userReports = response.data.filter(report => report.userId === user?.id);
        userReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMyReports(userReports);

        const addressPromises = userReports.map(async (report) => {
          if (report.latitude && report.longitude) {
            const address = await fetchAddress(report.latitude, report.longitude);
            return { id: report.id, address };
          }
          return { id: report.id, address: null };
        });

        const fetchedAddresses = await Promise.all(addressPromises);
        const addressMap = {};
        fetchedAddresses.forEach(({ id, address }) => {
          addressMap[id] = address;
        });
        setAddresses(addressMap);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setMyReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchMyReports();
      fetchNotifications();
    }
  }, [user?.id]);

  // Funzione per calcolare i messaggi non letti per un report
  const calculateUnreadMessages = async (reportId) => {
    try {
      const response = await messageAPI.getMessages(reportId);
      const messages = response.data || [];
      
      if (messages.length === 0) return 0;

      const storageKey = `lastReadMessage_${reportId}_${user?.id}`;
      const lastReadId = localStorage.getItem(storageKey);

      if (lastReadId) {
        const lastReadIdNum = Number.parseInt(lastReadId, 10);
        const newMessages = messages.filter(m => 
          m.id > lastReadIdNum && m.author?.id !== user?.id
        );
        return newMessages.length;
      } else {
        const unreadMessages = messages.filter(m => m.author?.id !== user?.id);
        return unreadMessages.length;
      }
    } catch (error) {
      console.error('Error calculating unread messages:', error);
      return 0;
    }
  };

  // Effetto per caricare i conteggi dei messaggi non letti
  useEffect(() => {
    const loadUnreadCounts = async () => {
      if (myReports.length === 0) return;

      const counts = {};
      for (const report of myReports) {
        // Calcola per TUTTI i report che hanno un tech officer assegnato
        // (la chat cittadino-tech ora funziona anche con report delegato)
        if (report.assignee?.id) {
          counts[report.id] = await calculateUnreadMessages(report.id);
        }
      }
      setUnreadChatCounts(counts);
    };

    loadUnreadCounts();

    // Listener per aggiornare quando la chat viene chiusa
    const handleChatRead = () => {
      loadUnreadCounts();
    };

    globalThis.addEventListener('chatMessageRead', handleChatRead);

    return () => {
      globalThis.removeEventListener('chatMessageRead', handleChatRead);
    };
  }, [myReports, user?.id]);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationAPI.getMyNotifications();
      setNotifications(response.data.slice(0, 3)); // Show only latest 3
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const renderReportsContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-muted-foreground mt-4">Updating...</p>
        </div>
      );
    }

    if (myReports.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No reports yet</p>
          <p className="text-sm mt-1">Create your first report above.</p>
        </div>
      );
    }

    return (
      <>
        {myReports.map((report) => (
      <div 
        key={report.id} 
        className="bg-card border border-border rounded-xl shadow-sm p-4 transition-all hover:shadow-md hover:border-primary/50 group"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-1 mr-2">
            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {report.title}
            </h3>
            {/* Badge chat per cittadino se ha messaggi non letti - solo icona senza numero */}
            {unreadChatCounts[report.id] > 0 && (
              <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0">
                <MessageSquare className="h-3 w-3" />
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/reports/${report.id}`)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-4 border-b border-border pb-2">
          <ReportStatus currentStatus={report.status} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
              <span 
                className="text-xs sm:text-sm truncate max-w-[200px] sm:max-w-xs font-medium text-foreground/80"
                title={addresses[report.id]} 
              >
                {addresses[report.id] || "Loading address..."}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs sm:text-sm">
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>

            {report.description && (
              <p className="text-xs sm:text-sm mt-1 bg-muted/50 p-2 rounded text-foreground/90 line-clamp-2 border border-border/50 italic">
                {report.description}
              </p>
            )}
          </div>

          {report.photos && report.photos.length > 0 && (
            <div className="flex gap-2 sm:grid sm:grid-cols-2 sm:w-32 shrink-0 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
              {report.photos.slice(0, 2).map((photo, idx) => (
                <img
                  key={photo || `photo-${report.id}-${idx}`}
                  src={getImageUrl(photo)}
                  alt="Evidence"
                  className="h-16 w-16 sm:h-auto sm:w-full aspect-square object-cover rounded-md border border-border shrink-0"
                  onError={handleImageError}
                />
              ))}
              {report.photos.length > 2 && (
                <div className="h-16 w-16 sm:h-auto sm:w-full aspect-square flex items-center justify-center bg-muted rounded-md border border-border text-xs font-medium shrink-0 text-muted-foreground">
                  +{report.photos.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        ))}
      </>
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-muted/20 dark:bg-background overflow-hidden transition-colors duration-300">
      
      <div className="shrink-0">
        <Navbar />
      </div>

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 overflow-hidden">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome, {user?.firstName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Your reports overview
            </p>
          </div>
          <Button onClick={() => navigate('/reports/new')} size="sm" className="gap-2 shadow-sm w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </div>

        {/* Notifications Widget */}
        {notifications.length > 0 && (
          <Card className="mb-4 shadow-md border-border shrink-0">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Recent Notifications</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/notifications')}
                  className="text-xs h-auto py-1"
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {loadingNotifications ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.reportId) navigate(`/reports/${notif.reportId}`);
                      else navigate('/notifications');
                    }}
                    className={`
                      flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors
                      ${notif.isRead ? 'bg-background hover:bg-accent' : 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50'}
                    `}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {!notif.isRead && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notif.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <Card className="max-h-full flex flex-col min-h-0 shadow-md border-border overflow-hidden">
          
          <CardHeader className="border-b border-border bg-card py-3 px-4 shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg text-foreground">My Reports</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Status updates & details
                </CardDescription>
              </div>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full font-medium">
                {myReports.length} Total
              </span>
            </div>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto bg-muted/30 dark:bg-muted/10 p-0">
            <CardContent className="p-3 sm:p-4 space-y-4">
              {renderReportsContent()}
            </CardContent>
          </div>
        </Card>
      </main>
    </div>
  );
}