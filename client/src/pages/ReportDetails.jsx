import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, urpAPI, messageAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Import Aggiunto
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, MapPin, Tag, AlertTriangle, X, Clock, Building2, CheckCircle, XCircle, MessageSquare } from 'lucide-react'; // Icone aggiunte
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import '@/components/MapView.css';
import { getStatusColor } from '@/lib/reportColors';
import ChatSheet from '@/components/chat/ChatSheet';

// ... (Il resto delle definizioni statiche come staticIcon, getImageUrl rimane invariato)
const staticIcon = L.divIcon({
  html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#000000" stroke="white" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`,
  className: 'custom-user-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `http://localhost:3000${cleanPath}`;
};

export default function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const { theme } = useTheme();
  
  const [report, setReport] = useState(null);
  const [address, setAddress] = useState('Loading address...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // NUOVI STATI PER I POPUP DI ASSEGNAZIONE
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);
  const [assignResult, setAssignResult] = useState({ open: false, success: false, message: '', title: '' });
  
  // STATO PER LA CHAT
  const [chatOpen, setChatOpen] = useState(false);
  const [extMaintChatOpen, setExtMaintChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [extMaintUnreadCount, setExtMaintUnreadCount] = useState(0);
  const [lastExtMaintMessageId, setLastExtMaintMessageId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportRes, catRes] = await Promise.all([
          reportAPI.getById(id),
          reportAPI.getCategories()
        ]);
        setReport(reportRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Report details unavailable.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  useEffect(() => {
    if (report?.latitude && report?.longitude) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${report.latitude}&lon=${report.longitude}&addressdetails=1`);
          const data = await res.json();
          
          const road = data.address?.road || data.address?.pedestrian || data.address?.street || "";
          const houseNumber = data.address?.house_number || "";
          let formattedAddress = `${road} ${houseNumber}`.trim();
          
          if (!formattedAddress) {
            formattedAddress = data.name || data.display_name || "Address not available";
          }
          
          setAddress(formattedAddress);
        } catch (error) {
          console.error("Geocoding error:", error);
          setAddress("Location details unavailable");
        }
      };
      
      fetchAddress();
    }
  }, [report]);

  const isOfficer = () => {
    if (!activeRole?.name) return false;
    const roleName = activeRole.name.toLowerCase();
    return roleName.includes('municipal') || roleName.includes('officer');
  };

  const isPending = () => {
    if (!report?.status) return false;
    const status = report.status.toLowerCase();
    return status === 'pending approval' || status === 'pending';
  };

  const showActions = isOfficer() && isPending();

  // NUOVA LOGICA DI ASSEGNAZIONE CON POPUP
  const handleAssignConfirm = async () => {
    setShowAssignConfirm(false); // Chiudi conferma
    setActionLoading(true);
    
    try {
      const response = await urpAPI.reviewReport(report.id, 'assigned');
      
      // Cerchiamo di ottenere il nome del tecnico assegnato dalla risposta
      // Assumiamo che response.data contenga il report aggiornato con l'assignee
      const assignedTech = response.data?.assignee 
        ? `${response.data.assignee.firstName} ${response.data.assignee.lastName}`
        : "Technical Officer";

      setAssignResult({
        open: true,
        success: true,
        title: "Assignment Successful",
        message: `Report successfully assigned to ${assignedTech}!`
      });

    } catch (error) {
      console.error("Assign failed", error);
      setAssignResult({
        open: true,
        success: false,
        title: "Assignment Failed",
        message: "Failed to assign report. Please try again."
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAssignResult = () => {
    setAssignResult(prev => ({ ...prev, open: false }));
    if (assignResult.success) {
      navigate('/municipal/dashboard');
    }
  };

  // Reject rimane con Toast standard come richiesto ("negli altri file va bene sonner")
  // O se intendevi anche Reject in questo file, dimmelo. Per ora lascio toast su reject.
  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await urpAPI.reviewReport(report.id, 'rejected', rejectReason);
      setIsRejectDialogOpen(false);
      toast.success("Report rejected"); 
      navigate('/municipal/dashboard');
    } catch (error) {
      console.error("Reject failed", error);
      toast.error("Error rejecting report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCategoryChange = async (newCategoryId) => {
    try {
      await urpAPI.updateReportCategory(report.id, Number.parseInt(newCategoryId));
      const updatedCat = categories.find(c => c.id === Number.parseInt(newCategoryId));
      setReport(prev => ({ 
        ...prev, 
        categoryId: Number.parseInt(newCategoryId), 
        category: updatedCat 
      }));
      toast.success("Category updated");
    } catch (error) {
      console.error("Category update failed", error);
      toast.error("Failed to update category");
    }
  };

  // Determina se mostrare le chat INLINE (solo per tech staff con delegazione)
  const canAccessChat = () => {
    console.log('=== canAccessChat CHECK START ===');
    console.log('User:', user?.id, user?.username);
    console.log('Active Role:', activeRole?.name);
    console.log('Report assignee:', report?.assignee?.id, report?.assignee?.username);
    console.log('Report external maintainer:', report?.externalMaintainer?.id, report?.externalMaintainer?.username);
    
    const userIsAssignee = user?.id === report?.assignee?.id;
    const reportHasDelegation = !!report?.externalMaintainer?.id;
    const userIsExternalMaintainer = user?.id === report?.externalMaintainer?.id;
    const activeRoleIsExtMaint = activeRole?.name?.toLowerCase().includes('external_maintainer');
    const activeRoleIsTechStaff = activeRole?.name?.toLowerCase().includes('technical_staff');
    
    console.log('Conditions:', {
      userIsAssignee,
      reportHasDelegation,
      userIsExternalMaintainer,
      activeRoleIsExtMaint,
      activeRoleIsTechStaff
    });
    
    // EDGE CASE: Se l'utente è CONTEMPORANEAMENTE assignee E external maintainer,
    // controlla il ruolo ATTIVO per decidere quale UI mostrare
    if (userIsAssignee && userIsExternalMaintainer) {
      // Se l'utente sta usando il ruolo di external maintainer, usa floating button
      if (activeRoleIsExtMaint) {
        console.log('✗ canAccessChat: FALSE - user is BOTH but activeRole is external_maintainer (use floating button)');
        console.log('=== canAccessChat CHECK END ===');
        return false;
      }
      // Se l'utente sta usando il ruolo di tech staff, mostra inline buttons
      if (activeRoleIsTechStaff && reportHasDelegation) {
        console.log('✓ canAccessChat: TRUE - user is BOTH but activeRole is technical_staff WITH delegation');
        console.log('=== canAccessChat CHECK END ===');
        return true;
      }
    }
    
    // Caso normale: utente è solo external maintainer sul report
    if (userIsExternalMaintainer && activeRoleIsExtMaint) {
      console.log('✗ canAccessChat: FALSE - user is external maintainer (use floating button instead)');
      console.log('=== canAccessChat CHECK END ===');
      return false;
    }
    
    // Caso normale: utente è solo assignee con delegation
    if (userIsAssignee && reportHasDelegation && activeRoleIsTechStaff) {
      console.log('✓ canAccessChat: TRUE - user is assignee WITH delegation');
      console.log('=== canAccessChat CHECK END ===');
      return true;
    }
    
    console.log('✗ canAccessChat: FALSE - conditions not met');
    console.log('=== canAccessChat CHECK END ===');
    return false;
  };

  // Determina se mostrare il floating button per cittadini
  const showCitizenFloatingChat = () => {
    // Cittadino può vedere floating button SOLO se il report è assegnato
    const isCitizen = user?.id === report?.user?.id;
    const isAssigned = report?.status && 
      (report.status.toLowerCase() === 'assigned' || 
       report.status.toLowerCase() === 'in progress' ||
       report.status.toLowerCase() === 'resolved');
    const hasAssignee = !!report?.assignee?.id;
    
    console.log('Citizen floating check:', { isCitizen, isAssigned, hasAssignee, isAnonymous: report?.anonymous });
    return isCitizen && isAssigned && hasAssignee && !report?.anonymous;
  };

  // Determina se mostrare il floating button per external maintainer e tech staff senza delegazione
  const showExtMaintFloatingChat = () => {
    console.log('=== showExtMaintFloatingChat CHECK START ===');
    console.log('User:', user?.id, user?.username);
    console.log('Active Role:', activeRole?.name);
    console.log('Report:', {
      id: report?.id,
      assigneeId: report?.assignee?.id,
      assigneeUsername: report?.assignee?.username,
      extMaintId: report?.externalMaintainer?.id,
      extMaintUsername: report?.externalMaintainer?.username
    });
    
    const isAssignedExtMaint = user?.id === report?.externalMaintainer?.id;
    const isAssignee = user?.id === report?.assignee?.id;
    const activeRoleIsExtMaint = activeRole?.name?.toLowerCase().includes('external_maintainer');
    const activeRoleIsTechStaff = activeRole?.name?.toLowerCase().includes('technical_staff');
    const isMunicipalOfficer = isOfficer();
    
    console.log('Conditions:', {
      isAssignedExtMaint,
      isAssignee,
      activeRoleIsExtMaint,
      activeRoleIsTechStaff,
      isMunicipalOfficer
    });
    
    // Se è MPRO, non può chattare con nessuno
    if (isMunicipalOfficer) {
      console.log('✗ showExtMaintFloatingChat: FALSE - MPRO cannot chat with anyone');
      console.log('=== showExtMaintFloatingChat CHECK END ===');
      return false;
    }
    
    // EDGE CASE: utente è sia assignee che external maintainer
    if (isAssignee && isAssignedExtMaint) {
      // Se sta usando il ruolo di external maintainer, mostra floating button
      if (activeRoleIsExtMaint) {
        console.log('✓ showExtMaintFloatingChat: TRUE - user is BOTH, activeRole is external_maintainer');
        console.log('=== showExtMaintFloatingChat CHECK END ===');
        return true;
      }
      // Se sta usando il ruolo di tech staff, NON mostrare floating (usa inline)
      if (activeRoleIsTechStaff) {
        console.log('✗ showExtMaintFloatingChat: FALSE - user is BOTH, activeRole is technical_staff (uses inline)');
        console.log('=== showExtMaintFloatingChat CHECK END ===');
        return false;
      }
    }
    
    // Caso normale: utente è solo external maintainer E sta usando quel ruolo
    if (isAssignedExtMaint && activeRoleIsExtMaint) {
      console.log('✓ showExtMaintFloatingChat: TRUE - user IS the assigned external maintainer with active role');
      console.log('=== showExtMaintFloatingChat CHECK END ===');
      return true;
    }
    
    // Caso normale: tech staff senza delegazione E sta usando ruolo tech staff
    if (isAssignee && !report?.externalMaintainer && activeRoleIsTechStaff) {
      console.log('✓ showExtMaintFloatingChat: TRUE - tech staff without delegation with active role');
      console.log('=== showExtMaintFloatingChat CHECK END ===');
      return true;
    }
    
    console.log('✗ showExtMaintFloatingChat: FALSE - no valid role/context for floating chat');
    console.log('=== showExtMaintFloatingChat CHECK END ===');
    return false;
  };

  // Controlla periodicamente se ci sono nuovi messaggi nella chat INTERNA (solo quando chat è chiusa)
  useEffect(() => {
    if (!extMaintChatOpen && canAccessChat() && report?.id && user && report?.externalMaintainer) {
      const checkNewMessages = async () => {
        try {
          const response = await messageAPI.getMessages(report.id, true); // internal=true per chat tech-external
          const messages = response.data || [];
          
          console.log('Checking INTERNAL messages:', { 
            totalMessages: messages.length, 
            lastExtMaintMessageId, 
            extMaintChatOpen,
            userId: user?.id 
          });
          
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            
            // Se è il primo caricamento della pagina
            if (lastExtMaintMessageId === null) {
              // Controlla localStorage per vedere se abbiamo già letto questi messaggi
              const storageKey = `lastReadMessage_${report.id}_${user?.id}_internal`;
              const lastReadId = localStorage.getItem(storageKey);
              
              if (lastReadId) {
                // Abbiamo già letto fino a lastReadId, conta solo i nuovi
                const lastReadIdNum = Number.parseInt(lastReadId, 10);
                const newMessages = messages.filter(m => 
                  m.id > lastReadIdNum && m.author?.id !== user?.id
                );
                console.log('First load INTERNAL, lastReadId from storage:', lastReadIdNum, 'new messages:', newMessages.length);
                setLastExtMaintMessageId(latestMessage.id);
                setExtMaintUnreadCount(newMessages.length);
              } else {
                // Mai aperta la chat prima, conta tutti i messaggi degli altri
                const unreadMessages = messages.filter(m => m.author?.id !== user?.id);
                console.log('First load INTERNAL, no history, unread messages from others:', unreadMessages.length);
                setLastExtMaintMessageId(latestMessage.id);
                setExtMaintUnreadCount(unreadMessages.length);
              }
            } else if (latestMessage.id !== lastExtMaintMessageId) {
              // Ci sono nuovi messaggi rispetto all'ultimo check
              const newMessages = messages.filter(m => 
                m.id > lastExtMaintMessageId && m.author?.id !== user?.id
              );
              console.log('New INTERNAL messages detected:', { 
                newMessagesCount: newMessages.length,
                latestMessageId: latestMessage.id,
                oldLastExtMaintMessageId: lastExtMaintMessageId
              });
              // Incrementa il contatore esistente
              setExtMaintUnreadCount(prev => prev + newMessages.length);
              // Aggiorna lastExtMaintMessageId per non contare di nuovo gli stessi messaggi
              setLastExtMaintMessageId(latestMessage.id);
            }
          }
        } catch (error) {
          console.error('Error checking INTERNAL messages:', error);
        }
      };

      // Controlla solo al mount, nessun polling automatico
      checkNewMessages();
    }
  }, [extMaintChatOpen, report?.id, user, lastExtMaintMessageId, report?.externalMaintainer]);

  // Controlla periodicamente se ci sono nuovi messaggi nella chat ESTERNA (solo quando chat è chiusa)
  useEffect(() => {
    if (!chatOpen && canAccessChat() && report?.id && user) {
      const checkNewMessages = async () => {
        try {
          const response = await messageAPI.getMessages(report.id, false); // internal=false per chat cittadino
          const messages = response.data || [];
          
          console.log('Checking messages:', { 
            totalMessages: messages.length, 
            lastMessageId, 
            chatOpen,
            userId: user?.id 
          });
          
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            
            // Se è il primo caricamento della pagina
            if (lastMessageId === null) {
              // Controlla localStorage per vedere se abbiamo già letto questi messaggi
              const storageKey = `lastReadMessage_${report.id}_${user?.id}_external`;
              const lastReadId = localStorage.getItem(storageKey);
              
              if (lastReadId) {
                // Abbiamo già letto fino a lastReadId, conta solo i nuovi
                const lastReadIdNum = Number.parseInt(lastReadId, 10);
                const newMessages = messages.filter(m => 
                  m.id > lastReadIdNum && m.author?.id !== user?.id
                );
                console.log('First load, lastReadId from storage:', lastReadIdNum, 'new messages:', newMessages.length);
                setLastMessageId(latestMessage.id);
                setUnreadCount(newMessages.length);
              } else {
                // Mai aperta la chat prima, conta tutti i messaggi degli altri
                const unreadMessages = messages.filter(m => m.author?.id !== user?.id);
                console.log('First load, no history, unread messages from others:', unreadMessages.length);
                setLastMessageId(latestMessage.id);
                setUnreadCount(unreadMessages.length);
              }
            } else if (latestMessage.id !== lastMessageId) {
              // Ci sono nuovi messaggi rispetto all'ultimo check
              const newMessages = messages.filter(m => 
                m.id > lastMessageId && m.author?.id !== user?.id
              );
              console.log('New messages detected:', { 
                newMessagesCount: newMessages.length,
                latestMessageId: latestMessage.id,
                oldLastMessageId: lastMessageId
              });
              // Incrementa il contatore esistente
              setUnreadCount(prev => prev + newMessages.length);
              // Aggiorna lastMessageId per non contare di nuovo gli stessi messaggi
              setLastMessageId(latestMessage.id);
            }
          }
        } catch (error) {
          console.error('Error checking messages:', error);
        }
      };

      // Controlla solo al mount, nessun polling automatico
      checkNewMessages();
    }
  }, [chatOpen, report?.id, user, lastMessageId]);

  // Reset contatore quando la chat ESTERNA viene aperta/chiusa
  useEffect(() => {
    const handleChatState = async () => {
      if (chatOpen) {
        // Chat APERTA - resetta tutto
        try {
          const response = await messageAPI.getMessages(report.id, false); // internal=false per chat cittadino
          const messages = response.data || [];
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            setLastMessageId(latestMessage.id);
            
            // Salva in localStorage per sincronizzare con i badge delle card
            const storageKey = `lastReadMessage_${report.id}_${user?.id}_external`;
            localStorage.setItem(storageKey, latestMessage.id.toString());
            
            console.log('[ReportDetails] Chat opened - saved to localStorage:', latestMessage.id);
            
            // Emetti evento per aggiornare i badge nelle liste
            globalThis.dispatchEvent(new Event('chatMessageRead'));
          }
          setUnreadCount(0);
        } catch (error) {
          console.error('Error resetting unread:', error);
        }
      }
    };
    
    handleChatState();
  }, [chatOpen, report?.id, user?.id]);

  // Reset contatore quando la chat INTERNA viene aperta/chiusa
  useEffect(() => {
    const handleExtMaintChatState = async () => {
      if (extMaintChatOpen) {
        // Chat INTERNA APERTA - resetta tutto
        try {
          const response = await messageAPI.getMessages(report.id, true); // internal=true per chat tech-external
          const messages = response.data || [];
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            setLastExtMaintMessageId(latestMessage.id);
            
            // Salva in localStorage per sincronizzare con i badge delle card
            const storageKey = `lastReadMessage_${report.id}_${user?.id}_internal`;
            localStorage.setItem(storageKey, latestMessage.id.toString());
            
            console.log('[ReportDetails] Internal chat opened - saved to localStorage:', latestMessage.id);
            
            // Emetti evento per aggiornare i badge nelle liste
            globalThis.dispatchEvent(new Event('chatMessageRead'));
          }
          setExtMaintUnreadCount(0);
        } catch (error) {
          console.error('Error resetting internal unread:', error);
        }
      }
    };
    
    handleExtMaintChatState();
  }, [extMaintChatOpen, report?.id, user?.id]);
  
  // Quando la chat ESTERNA si chiude, aggiorna SUBITO da localStorage
  useEffect(() => {
    if (!chatOpen && report?.id && user?.id) {
      console.log('[ReportDetails] Chat closed - rechecking messages IMMEDIATELY');
      const storageKey = `lastReadMessage_${report.id}_${user.id}_external`;
      const lastReadId = localStorage.getItem(storageKey);
      
      if (lastReadId) {
        console.log('[ReportDetails] Found lastReadId in localStorage:', lastReadId);
        const lastReadIdNum = Number.parseInt(lastReadId, 10);
        // Aggiorna IMMEDIATAMENTE e SINCRONAMENTE
        setLastMessageId(lastReadIdNum);
        setUnreadCount(0);
      }
    }
  }, [chatOpen, report?.id, user?.id]);

  // Quando la chat INTERNA si chiude, aggiorna SUBITO da localStorage
  useEffect(() => {
    if (!extMaintChatOpen && report?.id && user?.id) {
      console.log('[ReportDetails] Internal chat closed - rechecking messages IMMEDIATELY');
      const storageKey = `lastReadMessage_${report.id}_${user.id}_internal`;
      const lastReadId = localStorage.getItem(storageKey);
      
      if (lastReadId) {
        console.log('[ReportDetails] Found internal lastReadId in localStorage:', lastReadId);
        const lastReadIdNum = Number.parseInt(lastReadId, 10);
        // Aggiorna IMMEDIATAMENTE e SINCRONAMENTE
        setLastExtMaintMessageId(lastReadIdNum);
        setExtMaintUnreadCount(0);
      }
    }
  }, [extMaintChatOpen, report?.id, user?.id]);

  // Ascolta l'evento chatMessageRead per aggiornare il badge quando la chat viene chiusa
  useEffect(() => {
    const handleChatRead = () => {
      // Rileggi da localStorage e aggiorna il badge
      if (report?.id && user?.id) {
        const storageKey = `lastReadMessage_${report.id}_${user.id}_external`;
        const lastReadId = localStorage.getItem(storageKey);
        
        if (lastReadId && lastMessageId) {
          const lastReadIdNum = Number.parseInt(lastReadId, 10);
          // Se l'ultimo letto in storage è >= all'ultimo che conosciamo, reset badge
          if (lastReadIdNum >= lastMessageId) {
            setUnreadCount(0);
          }
        }
      }
    };

    globalThis.addEventListener('chatMessageRead', handleChatRead);
    return () => globalThis.removeEventListener('chatMessageRead', handleChatRead);
  }, [report?.id, user?.id, lastMessageId]);

  const renderAssigneeInfo = () => {
    if (isPending()) {
      return (
        <span className="text-muted-foreground flex items-center justify-start md:justify-end gap-2">
          Not assigned yet <Clock className="h-4 w-4" /> 
        </span>
      );
    }

    if (report.status === 'Rejected') {
      return (
        <span className="text-destructive flex items-center justify-start md:justify-end gap-2">
          Rejected <X className="h-4 w-4" /> 
        </span>
      );
    }

    return (
      <div className="text-primary flex flex-col items-start md:items-end gap-2">
        {/* Technical Officer Assignment */}
        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs text-muted-foreground mb-0.5">Assigned to</span>
          {report.assignee ? (
            <span className="flex items-center gap-2 font-semibold">
              {report.assignee.firstName} {report.assignee.lastName} <User className="h-4 w-4" />
            </span>
          ) : (
             <span className="flex items-center gap-2 font-semibold">
              Technical Staff <User className="h-4 w-4" />
            </span>
          )}
          <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            Office: {report.technicalOffice?.name || "Technical Office"} <Building2 className="h-3 w-3" />
          </span>
        </div>
        
        {/* External Maintainer Assignment */}
        {report.externalMaintainer && report.company && (
          <div className="flex flex-col items-start md:items-end pt-2 border-t border-muted w-full md:w-auto">
            <span className="text-xs text-muted-foreground mb-0.5">External Maintainer</span>
            <span className="flex items-center gap-2 font-semibold text-sm">
              {report.externalMaintainer.firstName} {report.externalMaintainer.lastName} <User className="h-3.5 w-3.5" />
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              Company: {report.company.name} <Building2 className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading details...</div>;
  if (error) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4">
      <div className="text-destructive font-semibold">{error}</div>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  return (
    <div data-cy="report-details-page" className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-6 pb-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 hover:pl-2 transition-all gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="space-y-6">
          {/* ... (Codice UI Header, Descrizione, Mappa, Categoria, Autore, Foto rimangono uguali) */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2 flex-1 w-full">
              <h1 data-cy="report-title" className="text-2xl md:text-3xl font-bold tracking-tight">{report.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">Created on {format(new Date(report.createdAt), 'PPP')}</p>
              {report.rejectionReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex gap-3 items-center text-red-600 dark:text-red-400 mt-2 inline-flex w-full md:w-auto">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                   <span data-cy="rejection-reason-text" className="font-medium text-sm">Reason for Rejection: {report.rejectionReason}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto mt-2 md:mt-0">
              <Badge data-cy="status-badge" className={`${getStatusColor(report.status)} h-6 text-xs px-2 text-white border-0`}>{report.status}</Badge>
              <div className="text-sm font-medium text-left md:text-right">{renderAssigneeInfo()}</div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-2">
            <h2 className="text-xl font-semibold">Description</h2>
            <p data-cy="report-description" className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{report.description}</p>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden" data-cy="map-section">
            <div className={`h-[300px] md:h-[500px] w-full relative z-0 ${theme === 'dark' ? 'dark-map' : ''}`}>
               <MapContainer center={[report.latitude, report.longitude]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} doubleClickZoom={false} touchZoom={false} attributionControl={false} className="h-full w-full">
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <Marker position={[report.latitude, report.longitude]} icon={staticIcon} />
               </MapContainer>
            </div>
            <div className="p-4 bg-background border-t flex items-center gap-3">
               <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div>
               <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm truncate">{address}</p>
                 <p className="text-xs text-muted-foreground font-mono">{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-lg p-6 space-y-2">
              <Label className="text-sm text-muted-foreground">Category</Label>
              {showActions ? (
                <Select value={report.categoryId?.toString()} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full" data-cy="category-select"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>{categories.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 font-medium"><Tag className="h-4 w-4 text-primary" />{report.category?.name || 'Uncategorized'}</div>
              )}
            </div>
            <div className="bg-card border rounded-lg p-6 space-y-2">
              <Label className="text-sm text-muted-foreground">Submitted By</Label>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                  <div><p data-cy="reporter-name" className="font-medium text-sm">{report.anonymous ? 'Anonymous Citizen' : (report.user?.username || report.reporterName || 'User')}</p></div>
                </div>
                {/* Pulsante Chat con cittadino per Tech Staff */}
                {user?.id === report?.assignee?.id && !report.anonymous && canAccessChat() && (
                  <Button
                    onClick={() => setChatOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-shrink-0 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Chat with {report.user?.firstName || 'Citizen'}
                    {unreadCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sezione Chat con External Maintainer - Solo per Tech Staff quando c'è delegazione */}
          {user?.id === report?.assignee?.id && report?.externalMaintainer && canAccessChat() && (
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Building2 className="h-5 w-5" />
                    Delegated to External Maintainer
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {report.externalMaintainer.firstName} {report.externalMaintainer.lastName} - {report.company?.name}
                  </p>
                </div>
                <Button
                  onClick={() => setExtMaintChatOpen(true)}
                  className="gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white flex-shrink-0 relative"
                  size="default"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with External Maintainer
                  {extMaintUnreadCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                      {extMaintUnreadCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Photos</h2>
            {report.photos && report.photos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-cy="photos-section">
                {report.photos.map((photo, index) => (
                  <div key={photo || `photo-${index}`} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={getImageUrl(photo)} alt={`Evidence ${index + 1}`} className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x400?text=Image+Not+Found"; }} />
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-muted-foreground">No photos attached to this report.</p>)}
          </div>

          {/* ACTIONS SECTION */}
          {showActions && (
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 w-full">
              <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-cy="btn-reject" variant="destructive" size="lg" className="w-full sm:w-auto sm:px-12 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white" disabled={actionLoading}>Reject</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reject Report</DialogTitle><DialogDescription>Please provide a reason. This will be sent to the citizen.</DialogDescription></DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="reason" className="mb-2 block">Reason</Label>
                    <Textarea id="reason" data-cy="rejection-textarea" placeholder="Why is this report being rejected?" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[100px]" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                    <Button data-cy="btn-confirm-reject" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>Confirm Rejection</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* TASTO ACCEPT & ASSIGN MODIFICATO CON CONFERMA */}
              <Button 
                size="lg" 
                data-cy="btn-approve"
                className="w-full sm:w-auto sm:px-12"
                onClick={() => setShowAssignConfirm(true)} 
                disabled={actionLoading}
              >
                Accept & Assign
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* ALERT DI CONFERMA ASSEGNAZIONE */}
      <AlertDialog open={showAssignConfirm} onOpenChange={setShowAssignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Report</AlertDialogTitle>
            <AlertDialogDescription>
              You are assigning this report, are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignConfirm} data-cy="btn-confirm-assign">Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* POPUP RISULTATO ASSEGNAZIONE (Sostituisce Toast) */}
      <Dialog open={assignResult.open} onOpenChange={handleCloseAssignResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${assignResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {assignResult.success ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              {assignResult.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-lg font-medium">
            {assignResult.message}
          </div>
          <DialogFooter>
            <Button onClick={handleCloseAssignResult} className="w-full" data-cy="btn-close-assign">
              {assignResult.success ? 'Go to Dashboard' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHAT SHEETS - Tech staff con delegazione (pulsanti inline) */}
      {canAccessChat() && (
        <>
          {/* ChatSheet per cittadino */}
          <ChatSheet
            open={chatOpen}
            onOpenChange={setChatOpen}
            reportId={report.id}
            technicalOfficer={report.assignee}
            externalMaintainer={null}
            citizen={report.user}
          />
          
          {/* ChatSheet per external maintainer */}
          <ChatSheet
            open={extMaintChatOpen}
            onOpenChange={setExtMaintChatOpen}
            reportId={report.id}
            technicalOfficer={report.assignee}
            externalMaintainer={report.externalMaintainer}
            citizen={null}
          />
        </>
      )}

      {/* CHAT SHEET - Cittadino (floating button) */}
      {showCitizenFloatingChat() && (
        <ChatSheet
          open={chatOpen}
          onOpenChange={setChatOpen}
          reportId={report.id}
          technicalOfficer={report.assignee}
          externalMaintainer={null}
          citizen={report.user}
        />
      )}

      {/* CHAT SHEET - Tech staff senza delegazione (floating button) */}
      {showExtMaintFloatingChat() && user?.id === report?.assignee?.id && (
        <ChatSheet
          open={chatOpen}
          onOpenChange={setChatOpen}
          reportId={report.id}
          technicalOfficer={report.assignee}
          externalMaintainer={null}
          citizen={report.user}
        />
      )}

      {/* CHAT SHEET - External Maintainer (floating button) */}
      {user?.id === report?.externalMaintainer?.id && showExtMaintFloatingChat() && (
        <ChatSheet
          open={chatOpen}
          onOpenChange={setChatOpen}
          reportId={report.id}
          technicalOfficer={report.assignee}
          externalMaintainer={report.externalMaintainer}
          citizen={null}
        />
      )}

      {/* FLOATING CHAT BUTTON - Cittadino */}
      {showCitizenFloatingChat() && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 bg-black hover:bg-gray-900 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center gap-2"
          aria-label="Chat with Technical Officer"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* FLOATING CHAT BUTTON - External Maintainer / Tech Staff without delegation */}
      {showExtMaintFloatingChat() && (user?.id === report?.externalMaintainer?.id || (user?.id === report?.assignee?.id && !report?.externalMaintainer)) && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 bg-black hover:bg-gray-900 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center gap-2"
          aria-label="Chat with Technical Officer"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

    </div>
  );
}