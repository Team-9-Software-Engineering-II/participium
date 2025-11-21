import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Camera, Image as ImageIcon, File, X, Upload, ChevronLeft, ChevronRight, MapPin, Search, Crosshair, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../components/MapView.css"; 
import { reportAPI, uploadAPI } from '../services/api';
// Importa fetchTurinBoundary
import { isPointInTurin, fetchTurinBoundary } from "@/lib/geoUtils";

const CATEGORIES = ['Water Supply', 'Architectural Barriers', 'Sewer System', 'Public Lighting', 'Waste', 'Road Signs', 'Roads and Urban Furnishings', 'Public Green Areas', 'Other'];
const CATEGORY_TO_ID = { 'Water Supply': 1, 'Architectural Barriers': 2, 'Sewer System': 3, 'Public Lighting': 4, 'Waste': 5, 'Road Signs': 6, 'Roads and Urban Furnishings': 7, 'Public Green Areas': 8, 'Other': 9 };

const turinBoundaryStyle = {
  color: "#3B82F6",
  weight: 3,
  fillColor: "#3B82F6",
  fillOpacity: 0.05,
  dashArray: '5, 5'
};

const createUserIcon = () => L.divIcon({
  html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#000000" stroke="white" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>`,
  className: 'custom-user-marker',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const fetchAddress = async (lat, lng, callback) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
    const data = await res.json();
    const road = data.address?.road || data.address?.pedestrian || data.address?.street || "";
    const houseNumber = data.address?.house_number || "";
    let formattedAddress = `${road} ${houseNumber}`.trim();
    if (!formattedAddress) formattedAddress = data.name || data.display_name || "Address not available";
    callback(formattedAddress);
    return formattedAddress;
  } catch (error) { console.error(error); return ""; }
};

function LocationMarker({ position, setPosition, setFormData, address, setSearchQuery, setSearchResults, turinGeoJSON }) {
  const markerRef = useRef(null);
  const [isInsideBoundary, setIsInsideBoundary] = useState(true);
  
  const handleLocationUpdate = (lat, lng) => {
    const inside = isPointInTurin(lat, lng, turinGeoJSON);
    setIsInsideBoundary(inside);
    setPosition([lat, lng]);

    if (inside) {
      if (setFormData) { setFormData(prev => ({ ...prev, latitude: lat, longitude: lng })); }
      fetchAddress(lat, lng, (addr) => { setFormData(prev => ({ ...prev, address: addr, location: addr })); });
    } else {
      if (setFormData) { setFormData(prev => ({ ...prev, latitude: null, longitude: null, address: "", location: "Area not supported" })); }
    }
  };

  useMapEvents({ click(e) { handleLocationUpdate(e.latlng.lat, e.latlng.lng); if (setSearchQuery) setSearchQuery(''); if (setSearchResults) setSearchResults([]); setTimeout(() => { if (markerRef.current) markerRef.current.openPopup(); }, 100); } });

  return position ? (
    <Marker position={position} icon={createUserIcon()} draggable={true} ref={markerRef} eventHandlers={{ dragend: (e) => { const marker = e.target; const pos = marker.getLatLng(); handleLocationUpdate(pos.lat, pos.lng); marker.openPopup(); } }}>
      <Popup className="custom-popup" maxWidth={280}>
        <div className="bg-white dark:bg-black rounded-lg p-2.5 shadow-lg" style={{ minWidth: '200px' }}>
          {isInsideBoundary ? (
            <>
              <div className="flex items-center gap-1.5 mb-1"><MapPin className="h-3.5 w-3.5 text-foreground flex-shrink-0" /><p className="text-xs font-bold text-foreground leading-tight flex-1">{address || 'Selected Location'}</p></div>
              <p className="text-[10px] text-muted-foreground pl-5">{position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-2">
               <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mb-2"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
               <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Area Not Supported</p>
               <p className="text-xs text-muted-foreground">Please select a location inside Turin.</p>
             </div>
          )}
        </div>
      </Popup>
    </Marker>
  ) : null;
}

function ZoomControl() {
  const map = useMapEvents({});
  const controlRef = useRef(null);
  useEffect(() => { if (controlRef.current) { try { map.removeControl(controlRef.current); } catch (e) {} } controlRef.current = L.control.zoom({ position: 'bottomright' }); controlRef.current.addTo(map); return () => { if (controlRef.current) { try { map.removeControl(controlRef.current); } catch (e) {} } }; }, [map]);
  return null;
}

function MapUpdater({ position }) {
  const map = useMap();
  const prevPosition = useRef(null);
  useEffect(() => {
    if (!position || !Array.isArray(position) || position.length !== 2) return;
    const posKey = `${position[0]},${position[1]}`;
    const prevKey = prevPosition.current ? `${prevPosition.current[0]},${prevPosition.current[1]}` : null;
    if (posKey === prevKey) return;
    prevPosition.current = position;
    try { if (map && map.setView) { map.setView(position, 15, { animate: true, duration: 1.5 }); } } catch (error) { console.error('Error in setView:', error); }
  }, [position, map]);
  return null;
}

export default function CreateReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mapPosition, setMapPosition] = useState([45.0703, 7.6869]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnonymousDialog, setShowAnonymousDialog] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [lastScale, setLastScale] = useState(1);
  const [turinGeoJSON, setTurinGeoJSON] = useState(null);
  
  const [formData, setFormData] = useState({ location: '', category: '', title: '', description: '', anonymous: false, photos: [], email: '', address: '', latitude: null, longitude: null });
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  // MODIFICATO: Usa fetchTurinBoundary
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTurinBoundary();
      if (data) setTurinGeoJSON(data);
    };
    loadData();
  }, []);

  useEffect(() => { const checkMobile = () => setIsMobile(window.innerWidth < 768); checkMobile(); window.addEventListener('resize', checkMobile); return () => window.removeEventListener('resize', checkMobile); }, []);
  useEffect(() => { if (user) { setFormData((prev) => ({ ...prev, email: user.email || '' })); } }, [user]);
  useEffect(() => {
    if (location.state?.coordinates) {
      const coords = location.state.coordinates;
      let lat, lng;
      if (Array.isArray(coords)) { [lat, lng] = coords; } else { lat = coords.lat; lng = coords.lng; }
      setMapPosition([lat, lng]);
      fetchAddress(lat, lng, (address) => { setFormData(prev => ({ ...prev, address, location: address, latitude: lat, longitude: lng })); });
    } else { setMapPosition([45.0703, 7.6869]); }
  }, [location.state]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
  const handleCategoryChange = (value) => { setFormData((prev) => ({ ...prev, category: value })); };
  const handleAnonymousToggle = (checked) => { setFormData((prev) => ({ ...prev, anonymous: checked })); };
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - formData.photos.length;
    const filesToAdd = files.slice(0, remainingSlots);
    if (filesToAdd.length > 0) {
      const newPhotos = [...formData.photos, ...filesToAdd];
      setFormData((prev) => ({ ...prev, photos: newPhotos }));
      const newPreviewUrls = filesToAdd.map((file) => URL.createObjectURL(file));
      setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };
  const handleRemovePhoto = (index) => { URL.revokeObjectURL(photoPreviewUrls[index]); setFormData((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) })); setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index)); };
  const handlePhotoClick = (index) => { setCurrentPhotoIndex(index); setShowPhotoViewer(true); setImageScale(1); };
  const handleTouchStart = (e) => { if (e.touches.length === 1) { const touch = e.touches[0]; setTouchStart({ x: touch.clientX, y: touch.clientY }); setTouchEnd({ x: touch.clientX, y: touch.clientY }); if (imageScale > 1) setIsPanning(true); } else if (e.touches.length === 2) { e.preventDefault(); const distance = Math.sqrt(Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) + Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)); setInitialPinchDistance(distance); setLastScale(imageScale); } };
  const handleTouchMove = (e) => { if (e.touches.length === 1) { const touch = e.touches[0]; setTouchEnd({ x: touch.clientX, y: touch.clientY }); if (imageScale > 1 && isPanning) { const deltaX = touch.clientX - touchStart.x; const deltaY = touch.clientY - touchStart.y; setImagePan({ x: deltaX, y: deltaY }); e.preventDefault(); } } else if (e.touches.length === 2) { e.preventDefault(); const distance = Math.sqrt(Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) + Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)); if (initialPinchDistance > 0) { const scale = (distance / initialPinchDistance) * lastScale; setImageScale(Math.min(Math.max(scale, 1), 4)); if (scale <= 1) setImagePan({ x: 0, y: 0 }); } } };
  const handleTouchEnd = (e) => { if (e.touches.length === 0) { if (!touchStart.x || !touchEnd.x) { setIsPanning(false); setInitialPinchDistance(0); return; } if (imageScale === 1) { const distance = touchStart.x - touchEnd.x; if (distance > 50 && photoPreviewUrls.length > 1) handleNextPhoto(); if (distance < -50 && photoPreviewUrls.length > 1) handlePreviousPhoto(); } setIsPanning(false); setTouchStart({ x: 0, y: 0 }); setTouchEnd({ x: 0, y: 0 }); setInitialPinchDistance(0); } };
  const handlePreviousPhoto = () => { setCurrentPhotoIndex((prev) => (prev === 0 ? photoPreviewUrls.length - 1 : prev - 1)); setImageScale(1); setImagePan({ x: 0, y: 0 }); };
  const handleNextPhoto = () => { setCurrentPhotoIndex((prev) => (prev === photoPreviewUrls.length - 1 ? 0 : prev + 1)); setImageScale(1); setImagePan({ x: 0, y: 0 }); };
  const handleClosePhotoViewer = () => { setShowPhotoViewer(false); setImageScale(1); setImagePan({ x: 0, y: 0 }); };
  const handleImageDoubleClick = () => { imageScale === 1 ? setImageScale(2) : setImageScale(1); };
  const handlePhotoViewerKeyDown = (e) => { if (e.key === 'ArrowLeft') handlePreviousPhoto(); else if (e.key === 'ArrowRight') handleNextPhoto(); };
  const handleSearchInput = (value) => { setSearchQuery(value); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); if (value.trim().length < 3) { setSearchResults([]); setShowSearchResults(false); return; } searchTimeoutRef.current = setTimeout(async () => { try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value + ', Torino')}&addressdetails=1&limit=30&countrycodes=it&dedupe=1`); const results = await res.json(); setSearchResults(results.slice(0, 5)); setShowSearchResults(true); } catch (error) { console.error('Search error:', error); } }, 250); };
  const handleSearchResultClick = (result) => { if (!result.lat || !result.lon) return; const lat = parseFloat(result.lat); const lon = parseFloat(result.lon); setMapPosition([lat, lon]); setFormData(prev => ({ ...prev, address: result.display_name, location: result.display_name, latitude: lat, longitude: lon })); setSearchQuery(result.display_name); setSearchResults([]); setShowSearchResults(false); };
  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); };
  const handleUseMyLocation = () => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((position) => { const lat = position.coords.latitude; const lng = position.coords.longitude; setMapPosition([lat, lng]); setFormData(prev => ({ ...prev, latitude: lat, longitude: lng })); fetchAddress(lat, lng, (address) => { setFormData(prev => ({ ...prev, address, location: address })); }); }, (error) => alert('Unable to get location.')); } };
  const handleSubmit = (e) => { e.preventDefault(); if (formData.anonymous) setShowAnonymousDialog(true); else submitReport(); };
  const submitReport = async () => { try { if (!formData.latitude || !formData.longitude) { alert('Please select a valid location within the Municipality of Turin.'); return; } let photoUrls = []; if (formData.photos.length > 0) { const uploadResponse = await uploadAPI.uploadPhotos(formData.photos); photoUrls = uploadResponse.data.files.map(file => file.url); } else { alert('At least one photo is required'); return; } const reportData = { title: formData.title, description: formData.description, categoryId: CATEGORY_TO_ID[formData.category], latitude: formData.latitude, longitude: formData.longitude, anonymous: formData.anonymous || false, photos: photoUrls }; await reportAPI.create(reportData); alert('Report submitted successfully!'); navigate('/'); } catch (error) { console.error('Error submitting report:', error); alert('Failed to submit report.'); } };
  const handleAnonymousConfirm = () => { submitReport(); };
  const handleAnonymousCancel = () => { setShowAnonymousDialog(false); };
  const MobilePhotoUpload = () => { const hasPhotos = formData.photos.length > 0; return ( <DropdownMenu> <DropdownMenuTrigger asChild> {hasPhotos ? ( <Button type="button" size="icon" className="rounded-full h-12 w-12"><Camera className="h-5 w-5" /></Button> ) : ( <Button type="button" variant="outline" size="lg" className="gap-2"><Camera className="h-5 w-5" /> Add Photo</Button> )} </DropdownMenuTrigger> <DropdownMenuContent> <DropdownMenuItem onSelect={() => document.getElementById('photo-camera')?.click()}><Camera className="mr-2 h-4 w-4" /> Camera</DropdownMenuItem> <DropdownMenuItem onSelect={() => document.getElementById('photo-library')?.click()}><ImageIcon className="mr-2 h-4 w-4" /> Photo Library</DropdownMenuItem> <DropdownMenuItem onSelect={() => document.getElementById('photo-file')?.click()}><File className="mr-2 h-4 w-4" /> File</DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> ); };
  const DesktopPhotoUpload = () => ( <Button type="button" variant="outline" size="lg" className="gap-2" onClick={() => document.getElementById('photo-upload')?.click()}> <Upload className="h-5 w-5" /> Add Photo </Button> );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">New Report</h1><p className="text-sm text-muted-foreground">Participium is a system to report urban maintenance issues...</p></div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isMobile && ( <button type="button" onClick={() => setShowMapDialog(true)} className="w-full bg-card border rounded-lg p-4 flex items-center gap-3 hover:bg-accent transition-colors text-left"> <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div> <div className="flex-1 min-w-0"> <p className="font-medium text-sm truncate">{formData.address || 'Report location point'}</p> <p className="text-xs text-muted-foreground">{formData.address ? 'Tap to change location' : 'Click to select location on map'}</p> </div> <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" /> </button> )}
            {!isMobile && (
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className={`relative ${theme === 'dark' ? 'dark-map' : ''}`} style={{ height: '500px' }}>
                  <MapContainer center={[45.0703, 7.6869]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      {turinGeoJSON && <GeoJSON data={turinGeoJSON} style={turinBoundaryStyle} />}
                      <ZoomControl />
                      <MapUpdater position={mapPosition} />
                      <LocationMarker position={mapPosition} setPosition={setMapPosition} setFormData={setFormData} address={formData.address} setSearchQuery={setSearchQuery} setSearchResults={setSearchResults} turinGeoJSON={turinGeoJSON} />
                    </MapContainer>
                  <div className="absolute top-4 left-4 right-4 z-[1000]">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Search for an address..." value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)} className="pl-10 pr-10 bg-white dark:bg-gray-900 shadow-lg" />{searchQuery && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="h-4 w-4 text-muted-foreground" /></button>}</div>
                    {showSearchResults && searchResults.length > 0 && ( <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto"> {searchResults.map((result, index) => ( <button key={index} type="button" onClick={() => handleSearchResultClick(result)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0"><p className="text-sm font-medium">{result.display_name}</p></button> ))} </div> )}
                  </div>
                  <button type="button" onClick={handleUseMyLocation} className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg"><Crosshair className="h-5 w-5" /></button>
                </div>
                <div className="p-4 bg-background border-t flex items-center gap-3"><div className="flex-shrink-0 bg-primary/10 p-2 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="font-medium text-sm">{formData.address || 'Click to select'}</p>{mapPosition && <p className="text-xs text-muted-foreground">{mapPosition[0].toFixed(6)}, {mapPosition[1].toFixed(6)}</p>}</div></div>
              </div>
            )}
            <div className="bg-card border rounded-lg p-6 space-y-4"> <h2 className="text-xl font-semibold">Information</h2> <div className="space-y-2"><Label>Location *</Label><Input value={formData.location} readOnly className="bg-muted cursor-default" />{formData.latitude && formData.longitude && <p className="text-xs text-muted-foreground">Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</p>}</div> <div className="space-y-2"><Label>Category *</Label><Select value={formData.category} onValueChange={handleCategoryChange} required><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}</SelectContent></Select></div> <div className="space-y-2"><Label>Title *</Label><Input name="title" value={formData.title} onChange={handleChange} maxLength={200} required /></div> <div className="space-y-2"><Label>Description *</Label><Textarea name="description" value={formData.description} onChange={handleChange} maxLength={2000} rows={6} required /></div> </div>
            <div className="bg-card border rounded-lg p-6 space-y-4"> <h2 className="text-xl font-semibold">Photos</h2> {formData.photos.length > 0 && ( <div className="grid grid-cols-3 gap-4"> {photoPreviewUrls.map((url, index) => ( <div key={index} className="relative aspect-square rounded-lg overflow-hidden border"><img src={url} alt="Preview" className="w-full h-full object-cover" onClick={() => handlePhotoClick(index)} /><button type="button" onClick={() => handleRemovePhoto(index)} className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"><X className="h-4 w-4" /></button></div> ))} </div> )} <div className={`flex ${formData.photos.length > 0 ? 'justify-end' : 'justify-center'}`}> {formData.photos.length < 3 && ( <> {isMobile ? <MobilePhotoUpload /> : <DesktopPhotoUpload />} {isMobile ? ( <> <input id="photo-camera" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" multiple /><input id="photo-library" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /><input id="photo-file" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /> </> ) : ( <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /> )} </> )} </div> </div>
            <div className="bg-card border rounded-lg p-6 space-y-4"> <h2 className="text-xl font-semibold">User</h2> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>First Name *</Label><Input value={user.firstName || ''} disabled className="bg-muted" /></div><div className="space-y-2"><Label>Last Name *</Label><Input value={user.lastName || ''} disabled className="bg-muted" /></div></div> <div className="space-y-2"><Label>Email *</Label><Input name="email" value={formData.email} onChange={handleChange} required /></div> <div className="flex items-center justify-between border-t pt-4"><div className="space-y-0.5"><Label className="text-base">Anonymous report?</Label><p className="text-sm text-muted-foreground">Your details won't be public.</p></div><Switch checked={formData.anonymous} onCheckedChange={handleAnonymousToggle} /></div> </div>
            <div className="flex justify-center"><Button type="submit" size="lg" className="px-12">Submit Report</Button></div>
          </form>
        </div>
      </div>
      <Dialog open={showAnonymousDialog} onOpenChange={setShowAnonymousDialog}><DialogContent><DialogHeader><DialogTitle>Anonymous Report</DialogTitle><DialogDescription>Sure?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={handleAnonymousCancel}>No</Button><Button onClick={handleAnonymousConfirm}>Yes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showPhotoViewer} onOpenChange={handleClosePhotoViewer}><DialogContent className="max-w-4xl w-full p-0 bg-black/99 border-0" onKeyDown={handlePhotoViewerKeyDown}><div className="relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><button onClick={handleClosePhotoViewer} className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><X className="h-5 w-5" /></button>{photoPreviewUrls.length > 1 && <div className="absolute top-4 left-4 z-10 bg-white/20 text-white px-3 py-1 rounded-full text-sm">{currentPhotoIndex + 1} / {photoPreviewUrls.length}</div>}<div className="flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-hidden"><img src={photoPreviewUrls[currentPhotoIndex]} alt="Photo" className="max-w-full max-h-[80vh] object-contain transition-transform duration-200" style={{ transform: `scale(${imageScale}) translate(${imagePan.x / imageScale}px, ${imagePan.y / imageScale}px)`, cursor: imageScale > 1 ? 'move' : 'default', touchAction: 'none' }} onDoubleClick={handleImageDoubleClick} /></div>{photoPreviewUrls.length > 1 && (<><button onClick={handlePreviousPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><ChevronLeft className="h-6 w-6" /></button><button onClick={handleNextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><ChevronRight className="h-6 w-6" /></button></>)}</div></DialogContent></Dialog>
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}><DialogContent className="max-w-full w-full h-full p-0 m-0"><div className="relative h-full flex flex-col"><div className="flex-1 relative"><MapContainer center={[45.0703, 7.6869]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{turinGeoJSON && <GeoJSON data={turinGeoJSON} style={turinBoundaryStyle} />}<ZoomControl /><MapUpdater position={mapPosition} /><LocationMarker position={mapPosition} setPosition={setMapPosition} setFormData={setFormData} address={formData.address} setSearchQuery={setSearchQuery} setSearchResults={setSearchResults} turinGeoJSON={turinGeoJSON} /></MapContainer></div><div className="p-4 border-t bg-background"><p className="text-center font-bold mb-2">{formData.address}</p><Button onClick={() => setShowMapDialog(false)} className="w-full">Confirm Location</Button></div></div></DialogContent></Dialog>
    </div>
  );
}