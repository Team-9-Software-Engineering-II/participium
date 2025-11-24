import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, urpAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, User, MapPin, Tag, AlertTriangle, Check, X, ImageIcon, Clock, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import '@/components/MapView.css';

// Icona personalizzata
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

const CATEGORIES = [
  { id: 1, name: 'Water Supply' },
  { id: 2, name: 'Architectural Barriers' },
  { id: 3, name: 'Sewer System' },
  { id: 4, name: 'Public Lighting' },
  { id: 5, name: 'Waste' },
  { id: 6, name: 'Road Signs' },
  { id: 7, name: 'Roads' },
  { id: 8, name: 'Public Green Areas' },
  { id: 9, name: 'Other' }
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const response = await reportAPI.getById(id);
      setReport(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Report not found or unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const isOfficer = () => {
    if (!user || !user.role) return false;
    const roleName = typeof user.role === 'string' ? user.role : user.role.name;
    return roleName && (
      roleName.toLowerCase().includes('municipal') || 
      roleName.toLowerCase().includes('officer')
    );
  };

  const isPending = () => {
    if (!report || !report.status) return false;
    const status = report.status.toLowerCase();
    return status === 'pending approval' || status === 'to assign' || status === 'pending';
  };

  const showActions = isOfficer() && isPending();

  const handleAssign = async () => {
    setActionLoading(true);
    try {
      await urpAPI.reviewReport(report.id, 'assigned');
      navigate('/municipal/dashboard');
    } catch (error) {
      console.error("Assign failed", error);
      alert("Error assigning report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await urpAPI.reviewReport(report.id, 'rejected', rejectReason);
      setIsRejectDialogOpen(false);
      navigate('/municipal/dashboard');
    } catch (error) {
      console.error("Reject failed", error);
      alert("Error rejecting report.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCategoryChange = async (newCategoryId) => {
    try {
      await urpAPI.updateReportCategory(report.id, parseInt(newCategoryId));
      const updatedCat = CATEGORIES.find(c => c.id === parseInt(newCategoryId));
      setReport(prev => ({ ...prev, categoryId: parseInt(newCategoryId), category: updatedCat }));
    } catch (error) {
      console.error("Category update failed", error);
      alert("Failed to update category");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading details...</div>;
  if (error) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4">
      <div className="text-destructive font-semibold">{error}</div>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-8 pb-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 hover:pl-2 transition-all gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="space-y-6">
          
          {/* 1. Header */}
          <div className="flex justify-between items-start gap-4">
            {/* Colonna Sinistra: Titolo e Dettagli */}
            <div className="space-y-2 flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{report.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                 Created on {format(new Date(report.createdAt), 'PPP')}
              </p>
              
              {report.rejectionReason && (
                // MODIFICA QUI: Colori espliciti red-500/400 per visibilità in dark mode
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex gap-3 items-center text-red-600 dark:text-red-400 mt-2 inline-flex">
                   <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                   <span className="font-medium text-sm">Reason for Rejection: {report.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Colonna Destra: Status e Assignee */}
            <div className="flex flex-col items-end gap-2">
              {/* Status Badge */}
              <Badge className={`${REPORT_STATUS_COLORS[report.status] || 'bg-gray-500'} h-6 text-xs px-2`}>
                {report.status}
              </Badge>

              {/* Assignee Info */}
              <div className="text-sm font-medium text-right">
                {isPending() ? (
                  <span className="text-muted-foreground flex items-center justify-end gap-2">
                    Not assigned yet <Clock className="h-4 w-4" /> 
                  </span>
                ) : report.status === 'Rejected' ? (
                  <span className="text-destructive flex items-center justify-end gap-2">
                    Rejected <X className="h-4 w-4" /> 
                  </span>
                ) : (
                  <div className="text-primary flex flex-col items-end">
                    <span className="text-xs text-muted-foreground mb-0.5">Assigned to</span>
                    
                    {/* Nome Assignee */}
                    {report.assignee ? (
                      <span className="flex items-center gap-2 font-semibold">
                        {report.assignee.firstName} {report.assignee.lastName} <User className="h-4 w-4" />
                      </span>
                    ) : (
                       // Fallback
                       <span className="flex items-center gap-2 font-semibold">
                        Technical Staff <User className="h-4 w-4" />
                      </span>
                    )}

                    {/* Ufficio */}
                    <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      Office: {report.technicalOffice?.name || "Technical Office"} <Building2 className="h-3 w-3" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Descrizione */}
          <div className="bg-card border rounded-lg p-6 space-y-2">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
              {report.description}
            </p>
          </div>

          {/* 3. Mappa */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className={`h-[500px] w-full relative z-0 ${theme === 'dark' ? 'dark-map' : ''}`}>
               <div className="absolute inset-0 z-[1000] bg-transparent cursor-default" />
               <MapContainer 
                 center={[report.latitude, report.longitude]} 
                 zoom={15} 
                 scrollWheelZoom={false}
                 dragging={false}
                 zoomControl={false}
                 doubleClickZoom={false}
                 touchZoom={false}
                 attributionControl={false}
                 className="h-full w-full"
               >
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <Marker position={[report.latitude, report.longitude]} icon={staticIcon} />
               </MapContainer>
            </div>
            <div className="p-4 bg-background border-t flex items-center gap-3">
               <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                 <MapPin className="h-5 w-5 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm">Report Location</p>
                 <p className="text-xs text-muted-foreground font-mono">
                   {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                 </p>
               </div>
            </div>
          </div>

          {/* 4. Categoria e Autore */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Categoria */}
            <div className="bg-card border rounded-lg p-6 space-y-2">
              <Label className="text-sm text-muted-foreground">Category</Label>
              {showActions ? (
                <Select 
                  value={report.categoryId?.toString()} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 font-medium">
                  <Tag className="h-4 w-4 text-primary" />
                  {report.category?.name || 'Uncategorized'}
                </div>
              )}
            </div>

            {/* Autore */}
            <div className="bg-card border rounded-lg p-6 space-y-2">
              <Label className="text-sm text-muted-foreground">Submitted By</Label>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                   <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                   <p className="font-medium text-sm">
                     {report.anonymous ? 'Anonymous Citizen' : (report.user?.username || report.reporterName || 'User')}
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Foto */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Photos</h2>
            {report.photos && report.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {report.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={getImageUrl(photo)}
                      alt={`Evidence ${index + 1}`}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = "https://placehold.co/600x400?text=Image+Not+Found"; 
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No photos attached to this report.</p>
            )}
          </div>

          {/* 6. Pulsanti Azione */}
          {showActions && (
            <div className="flex justify-center gap-4 pt-4">
              <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogTrigger asChild>
                  {/* MODIFICA QUI: dark:bg-red-600 per avere un rosso più chiaro in dark mode */}
                  <Button 
                    variant="destructive" 
                    size="lg" 
                    className="px-12 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white" 
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Report</DialogTitle>
                    <DialogDescription>
                      Please provide a reason. This will be sent to the citizen.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="reason" className="mb-2 block">Reason</Label>
                    <Textarea 
                      id="reason" 
                      placeholder="Why is this report being rejected?" 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>
                      Confirm Rejection
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button 
                size="lg" 
                className="px-12"
                onClick={handleAssign} 
                disabled={actionLoading}
              >
                Accept & Assign
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}