import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, urpAPI } from '@/services/api';
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
import { ArrowLeft, User, MapPin, Tag, AlertTriangle, X, Clock, Building2, CheckCircle, XCircle } from 'lucide-react'; // Icone aggiunte
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import '@/components/MapView.css';

// ... (Il resto delle definizioni statiche come staticIcon, REPORT_STATUS_COLORS, getImageUrl rimane invariato)
const staticIcon = L.divIcon({
  html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#000000" stroke="white" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`,
  className: 'custom-user-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const REPORT_STATUS_COLORS = {
  'To Assign': 'bg-blue-500',
  'Pending Approval': 'bg-blue-500',
  'Assigned': 'bg-orange-500',
  'In Progress': 'bg-yellow-500',
  'Completed': 'bg-green-500',
  'Rejected': 'bg-red-500'
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `http://localhost:3000${cleanPath}`;
};

export default function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (!user?.role) return false;
    const roleName = typeof user.role === 'string' ? user.role : user.role.name;
    return roleName?.toLowerCase().includes('municipal') || 
           roleName?.toLowerCase().includes('officer');
  };

  const isPending = () => {
    if (!report?.status) return false;
    const status = report.status.toLowerCase();
    return status === 'pending approval' || status === 'to assign' || status === 'pending';
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
      <div className="text-primary flex flex-col items-start md:items-end">
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
              <Badge data-cy="status-badge" className={`${REPORT_STATUS_COLORS[report.status] || 'bg-gray-500'} h-6 text-xs px-2 text-white border-0`}>{report.status}</Badge>
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
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                <div><p data-cy="reporter-name" className="font-medium text-sm">{report.anonymous ? 'Anonymous Citizen' : (report.user?.username || report.reporterName || 'User')}</p></div>
              </div>
            </div>
          </div>

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

    </div>
  );
}