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
import { Camera, Image as ImageIcon, File, X, Upload, ChevronLeft, ChevronRight, MapPin, Search, Crosshair, AlertTriangle, Plus, Minus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../components/MapView.css"; 
import { reportAPI, uploadAPI } from '../services/api';
import { isPointInTurin, fetchTurinBoundary } from "@/lib/geoUtils";

//const CATEGORIES = ['Water Supply', 'Architectural Barriers', 'Sewer System', 'Public Lighting', 'Waste', 'Road Signs', 'Roads and Urban Furnishings', 'Public Green Areas', 'Other'];
//const CATEGORY_TO_ID = { 'Water Supply': 1, 'Architectural Barriers': 2, 'Sewer System': 3, 'Public Lighting': 4, 'Waste': 5, 'Road Signs': 6, 'Roads and Urban Furnishings': 7, 'Public Green Areas': 8, 'Other': 9 };
const DEFAULT_CENTER = [45.0703, 7.6869]; // Torino Centro

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

function LocationMarker({ position, setPosition, setFormData, address, setSearchQuery, setSearchResults, turinGeoJSON, isSearching }) {
  const markerRef = useRef(null);
  const [isInsideBoundary, setIsInsideBoundary] = useState(true);
  
  useEffect(() => {
    if (position && turinGeoJSON) {
      const inside = isPointInTurin(position[0], position[1], turinGeoJSON);
      setIsInsideBoundary(inside);
      
      const isDefaultPosition = position[0] === DEFAULT_CENTER[0] && position[1] === DEFAULT_CENTER[1];
      
      if (markerRef.current && !isDefaultPosition) {
        markerRef.current.openPopup();
      }

      if (isSearching && isSearching.current) {
        isSearching.current = false; 
      } else {
        if (isDefaultPosition && !address) {
            return;
        }

        if (inside) {
          if (setFormData) { setFormData(prev => ({ ...prev, latitude: position[0], longitude: position[1] })); }
          fetchAddress(position[0], position[1], (addr) => { 
             if (setFormData) setFormData(prev => ({ ...prev, address: addr, location: addr })); 
          });
        } else {
          if (setFormData) { setFormData(prev => ({ ...prev, latitude: null, longitude: null, address: "", location: "Area not supported" })); }
        }
      }
    }
  }, [position, turinGeoJSON, isSearching, setFormData]); // removed address from dep

  const handleMapClick = (lat, lng) => {
    setPosition([lat, lng]);
    if (setSearchQuery) setSearchQuery('');
    if (setSearchResults) setSearchResults([]);
  };

  useMapEvents({ click(e) { handleMapClick(e.latlng.lat, e.latlng.lng); } });

  return position ? (
    <Marker 
      position={position} 
      icon={createUserIcon()} 
      draggable={true} 
      ref={markerRef} 
      eventHandlers={{ 
        dragend: (e) => { 
          const marker = e.target; 
          const pos = marker.getLatLng(); 
          setPosition([pos.lat, pos.lng]); 
        } 
      }}
    >
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (controlRef.current) { try { map.removeControl(controlRef.current); } catch (e) {} }
    
    // Mobile: bottomleft (Left Handed Thumb)
    // Desktop: bottomright (Standard)
    const position = isMobile ? 'bottomleft' : 'bottomright';

    controlRef.current = L.control.zoom({ position });
    controlRef.current.addTo(map);
    return () => { if (controlRef.current) { try { map.removeControl(controlRef.current); } catch (e) {} } };
  }, [map, isMobile]);
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
    
    const lat = parseFloat(position[0]);
    const lng = parseFloat(position[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (lat === DEFAULT_CENTER[0] && lng === DEFAULT_CENTER[1]) return;

    try { map.setView([lat, lng], 16, { animate: true, duration: 1.5 }); } catch (error) { console.error('Error in setView:', error); }
  }, [position, map]);
  return null;
}

export default function CreateReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [mapPosition, setMapPosition] = useState(DEFAULT_CENTER); 
  
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
  
  const isSearching = useRef(false);
  
  const [formData, setFormData] = useState({ location: '', category: '', title: '', description: '', anonymous: false, photos: [], email: '', address: '', latitude: null, longitude: null });
  const [tempLocationData, setTempLocationData] = useState({ address: '', location: '', latitude: null, longitude: null });
  
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const [categories, setCategories] = useState([]);

  // useEffect per caricare le categorie:
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await reportAPI.getCategories();
        setCategories(response.data);
      } catch (error) {
        console.error("Failed to load categories", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const data = await fetchTurinBoundary();
        if (data) setTurinGeoJSON(data);
      } catch (error) { console.error(error); }
    };
    fetchGeoJSON();
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
    } 
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
  
  const handleSearchResultClick = (result) => { 
    if (!result.lat || !result.lon) return; 
    const lat = parseFloat(result.lat); 
    const lon = parseFloat(result.lon); 
    
    isSearching.current = true;
    setMapPosition([lat, lon]); 
    
    const newAddress = result.display_name;
    const newLocationData = {
        address: newAddress,
        location: newAddress,
        latitude: lat,
        longitude: lon
    };

    if (isMobile && showMapDialog) {
        setTempLocationData(prev => ({ ...prev, ...newLocationData }));
    } else {
        setFormData(prev => ({ ...prev, ...newLocationData }));
    }
    
    setSearchQuery(result.display_name); 
    setSearchResults([]); 
    setShowSearchResults(false); 
  };
  
  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); };
  const handleUseMyLocation = () => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((position) => { const lat = position.coords.latitude; const lng = position.coords.longitude; setMapPosition([lat, lng]); 
    if (isMobile && showMapDialog) {
        setTempLocationData(prev => ({ ...prev, latitude: lat, longitude: lng })); 
    } else {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }
    }, (error) => alert('Unable to get location.')); } };
  const handleSubmit = (e) => { e.preventDefault(); if (formData.anonymous) setShowAnonymousDialog(true); else submitReport(); };
  const submitReport = async () => { try { if (!formData.latitude || !formData.longitude) { alert('Please select a valid location within the Municipality of Turin.'); return; } let photoUrls = []; if (formData.photos.length > 0) { const uploadResponse = await uploadAPI.uploadPhotos(formData.photos); photoUrls = uploadResponse.data.files.map(file => file.url); } else { alert('At least one photo is required'); return; } const reportData = { title: formData.title, description: formData.description, categoryId: parseInt(formData.category), latitude: formData.latitude, longitude: formData.longitude, anonymous: formData.anonymous || false, photos: photoUrls }; await reportAPI.create(reportData); alert('Report submitted successfully!'); navigate('/'); } catch (error) { console.error('Error submitting report:', error); alert('Failed to submit report.'); } };
  const handleAnonymousConfirm = () => { submitReport(); };
  const handleAnonymousCancel = () => { setShowAnonymousDialog(false); };
  
  const handleOpenMobileMap = () => {
    setTempLocationData({
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: formData.address,
      location: formData.location
    });
    if (formData.latitude && formData.longitude) {
      setMapPosition([formData.latitude, formData.longitude]);
    } else {
      setMapPosition(DEFAULT_CENTER);
    }
    setShowMapDialog(true);
  };

  const handleConfirmMobileMap = () => {
    setFormData(prev => ({
      ...prev,
      latitude: tempLocationData.latitude,
      longitude: tempLocationData.longitude,
      address: tempLocationData.address,
      location: tempLocationData.location
    }));
    setShowMapDialog(false);
  };

  const MobilePhotoUpload = () => {
    const hasPhotos = formData.photos.length > 0;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            type="button" 
            variant={hasPhotos ? "default" : "outline"} 
            size={hasPhotos ? "icon" : "lg"} 
            className={hasPhotos ? "rounded-full h-12 w-12" : "gap-2"}
          >
            <Camera className={hasPhotos ? "h-5 w-5" : "h-5 w-5"} />
            {!hasPhotos && "Add Photo"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-camera')?.click()}>
            <Camera className="mr-2 h-4 w-4" /> Camera
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-library')?.click()}>
            <ImageIcon className="mr-2 h-4 w-4" /> Photo Library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-file')?.click()}>
            <File className="mr-2 h-4 w-4" /> File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const DesktopPhotoUpload = () => ( <Button type="button" variant="outline" size="lg" className="gap-2" onClick={() => document.getElementById('photo-upload')?.click()}> <Upload className="h-5 w-5" /> Add Photo </Button> );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 data-cy="create-report-title" className="text-3xl font-bold tracking-tight">New Report</h1>
            <p data-cy="create-report-warning" className="text-sm text-muted-foreground">
              <strong>ATTENTION:</strong> Participium is a system to report urban maintenance issues and not emergencies that require immediate intervention.
              In case of fires it is essential to contact the competent authorities such as Firefighters, Police, etc.
              If necessary therefore in case of temporary intervention, we advise you not to proceed with this report but to contact the relevant services.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isMobile && ( <button type="button" onClick={handleOpenMobileMap} className="w-full bg-card border rounded-lg p-4 flex items-center gap-3 hover:bg-accent transition-colors text-left"> <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div> <div className="flex-1 min-w-0"> <p className="font-medium text-sm truncate">{formData.address || 'Report location point'}</p> <p className="text-xs text-muted-foreground">{formData.address ? 'Tap to change location' : 'Click to select location on map'}</p> </div> <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" /> </button> )}
            {!isMobile && (
              <div className="bg-card border rounded-lg overflow-hidden">
                {/* CSS INJECTION FOR CONTROLS */}
                <style>{`
                  @media (min-width: 769px) {
                    #root .leaflet-container .leaflet-bottom.leaflet-right {
                      bottom: auto !important;
                      top: 400px !important;
                      right: 10px !important;
                    }
                  }
                  @media (max-width: 768px) {
                    #root .leaflet-container .leaflet-bottom.leaflet-left {
                      bottom: 90px !important;
                      left: 16px !important;
                      right: auto !important;
                    }
                    #root .leaflet-container .leaflet-bottom.leaflet-right {
                       display: none;
                    }
                  }
                `}</style>
                
                <div className={`relative z-0 ${theme === 'dark' ? 'dark-map' : ''}`} style={{ height: '500px' }}>
                  {/* FIX ZOOM: 14 di default */}
                  <MapContainer center={DEFAULT_CENTER} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      {turinGeoJSON && <GeoJSON data={turinGeoJSON} style={turinBoundaryStyle} />}
                      <ZoomControl />
                      <MapUpdater position={mapPosition} />
                      <LocationMarker position={mapPosition} setPosition={setMapPosition} setFormData={setFormData} address={formData.address} setSearchQuery={setSearchQuery} setSearchResults={setSearchResults} turinGeoJSON={turinGeoJSON} isSearching={isSearching} />
                    </MapContainer>
                  <div className="absolute top-4 left-4 right-4 z-[500]">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Search for an address..." value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)} className="pl-10 pr-10 bg-white dark:bg-gray-900 shadow-lg" />{searchQuery && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X className="h-4 w-4 text-muted-foreground" /></button>}</div>
                    {showSearchResults && searchResults.length > 0 && ( <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto"> {searchResults.map((result, index) => ( <button key={index} type="button" onClick={() => handleSearchResultClick(result)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0"><p className="text-sm font-medium">{result.display_name}</p></button> ))} </div> )}
                  </div>
                  <button type="button" onClick={handleUseMyLocation} className="absolute bottom-4 left-4 z-[500] bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg"><Crosshair className="h-5 w-5" /></button>
                </div>
                <div className="p-4 bg-background border-t flex items-center gap-3"><div className="flex-shrink-0 bg-primary/10 p-2 rounded-full"><MapPin className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="font-medium text-sm">{formData.address || 'Click to select'}</p>{mapPosition && <p className="text-xs text-muted-foreground">{mapPosition[0].toFixed(6)}, {mapPosition[1].toFixed(6)}</p>}</div></div>
              </div>
            )}
            
            <div className="bg-card border rounded-lg p-6 space-y-4">
               <h2 className="text-xl font-semibold">Information</h2>
               <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input id="location" name="location" type="text" placeholder="Select location on map" value={formData.location} readOnly className="bg-muted cursor-default" required />
                  {formData.latitude && formData.longitude && <p className="text-xs text-muted-foreground">Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</p>}
               </div>
               <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category.toString()} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))} required>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>{categories.map((category) => (<SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title of the report *</Label>
                <Input id="title" name="title" type="text" placeholder="Brief description (max 200 characters)" value={formData.title} onChange={handleChange} maxLength={200} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" name="description" placeholder="Detailed description of the report (max 2000 characters)" value={formData.description} onChange={handleChange} maxLength={2000} rows={6} className="resize-none" required />
              </div>
            </div>
            
            <div className="bg-card border rounded-lg p-6 space-y-4"> 
              <h2 className="text-xl font-semibold">Photos</h2> 
              {formData.photos.length > 0 && ( 
                <div className="grid grid-cols-3 gap-4"> 
                  {photoPreviewUrls.map((url, index) => ( 
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" onClick={() => handlePhotoClick(index)} />
                      <button type="button" onClick={() => handleRemovePhoto(index)} className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"><X className="h-4 w-4" /></button>
                    </div> 
                  ))} 
                </div> 
              )} 
              <div className={`flex ${formData.photos.length > 0 ? 'justify-end' : 'justify-center'}`}> 
                {formData.photos.length < 3 && ( 
                  <> {isMobile ? <MobilePhotoUpload /> : <DesktopPhotoUpload />} 
                     {isMobile ? ( 
                        <> <input id="photo-camera" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" multiple /><input id="photo-library" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /><input id="photo-file" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /> </> 
                     ) : ( 
                        <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" multiple /> 
                     )} 
                  </> 
                )} 
              </div>
              {formData.photos.length === 0 && <p className="text-sm text-muted-foreground text-center mt-2">No photos added yet</p>}
              {formData.photos.length > 0 && <p className="text-sm text-muted-foreground text-right">{formData.photos.length} of 3 photos uploaded</p>}
            </div>
            
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">User</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="firstName">First Name *</Label><Input id="firstName" type="text" value={user.firstName || ''} disabled className="bg-muted" /></div>
                <div className="space-y-2"><Label htmlFor="lastName">Last Name *</Label><Input id="lastName" type="text" value={user.lastName || ''} disabled className="bg-muted" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required /></div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5"><Label htmlFor="anonymous" className="text-base">Do you want to send this report anonymously?</Label><p className="text-sm text-muted-foreground">Your personal information will not be visible to other users</p></div>
                <Switch id="anonymous" checked={formData.anonymous} onCheckedChange={handleAnonymousToggle} />
              </div>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">* Required field</p>

            <div className="flex justify-center gap-4">
              <Button type="button" variant="outline" size="lg" className="px-12" onClick={() => navigate('/')}>Cancel</Button>
              <Button type="submit" size="lg" className="px-12">Submit Report</Button>
            </div>
          </form>
        </div>
      </div>
      <Dialog open={showAnonymousDialog} onOpenChange={setShowAnonymousDialog}><DialogContent><DialogHeader><DialogTitle>Anonymous Report</DialogTitle><DialogDescription>You are submitting this report anonymously, are you sure?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={handleAnonymousCancel}>No</Button><Button onClick={handleAnonymousConfirm}>Yes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showPhotoViewer} onOpenChange={handleClosePhotoViewer}><DialogContent className="max-w-4xl w-full p-0 bg-black/99 border-0" onKeyDown={handlePhotoViewerKeyDown}><div className="relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><button onClick={handleClosePhotoViewer} className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><X className="h-5 w-5" /></button>{photoPreviewUrls.length > 1 && <div className="absolute top-4 left-4 z-10 bg-white/20 text-white px-3 py-1 rounded-full text-sm">{currentPhotoIndex + 1} / {photoPreviewUrls.length}</div>}<div className="flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-hidden"><img src={photoPreviewUrls[currentPhotoIndex]} alt="Photo" className="max-w-full max-h-[80vh] object-contain transition-transform duration-200" style={{ transform: `scale(${imageScale}) translate(${imagePan.x / imageScale}px, ${imagePan.y / imageScale}px)`, cursor: imageScale > 1 ? 'move' : 'default', touchAction: 'none' }} onDoubleClick={handleImageDoubleClick} /></div>{photoPreviewUrls.length > 1 && (<><button onClick={handlePreviousPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><ChevronLeft className="h-6 w-6" /></button><button onClick={handleNextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"><ChevronRight className="h-6 w-6" /></button></>)}</div></DialogContent></Dialog>
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0">
          <DialogTitle className="sr-only">Select Location</DialogTitle>
          <DialogDescription className="sr-only">Interact with the map to pin the location of your report.</DialogDescription>
          <div className="relative h-full flex flex-col">
            <div className={`flex-1 relative z-0 ${theme === 'dark' ? 'dark-map' : ''}`}>
              {/* CSS INJECTION FOR MOBILE CONTROLS */}
              <style>{`
                  @media (max-width: 768px) {
                    #root .leaflet-container .leaflet-bottom.leaflet-left {
                      bottom: 90px !important;
                      left: 16px !important;
                    }
                  }
              `}</style>
              <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {turinGeoJSON && <GeoJSON data={turinGeoJSON} style={turinBoundaryStyle} />}
                <ZoomControl />
                <MapUpdater position={mapPosition} />
                {/* FIX: Passiamo setTempLocationData invece di setFormData */}
                <LocationMarker position={mapPosition} setPosition={setMapPosition} setFormData={setTempLocationData} address={tempLocationData.address} setSearchQuery={setSearchQuery} setSearchResults={setSearchResults} turinGeoJSON={turinGeoJSON} isSearching={isSearching} />
              </MapContainer>
              <div className="absolute top-4 left-4 right-4 z-[500]">
                <div className="relative flex items-center bg-white dark:bg-gray-900 rounded-md shadow-md border border-gray-200 dark:border-gray-800">
                  <Search className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input type="text" placeholder="Search for an address..." value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)} className="flex-1 border-0 focus-visible:ring-0 bg-transparent shadow-none h-10" />
                  {searchQuery && <button type="button" onClick={clearSearch} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mr-1"><X className="h-4 w-4 text-muted-foreground" /></button>}
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                  <button type="button" onClick={handleUseMyLocation} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mr-1"><Crosshair className="h-5 w-5 text-primary" /></button>
                </div>
                {showSearchResults && searchResults.length > 0 && ( <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto"> {searchResults.map((result, index) => ( <button key={index} type="button" onClick={() => handleSearchResultClick(result)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0"><p className="text-sm font-medium">{result.display_name}</p></button> ))} </div> )}
              </div>
            </div>
            <div className="p-4 border-t bg-background space-y-2">
              <p className="text-center font-bold mb-2 text-sm">{tempLocationData.address}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowMapDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirmMobileMap} className="flex-1">Confirm Location</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}