import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Camera, Image as ImageIcon, File, X, Upload, ChevronLeft, ChevronRight, MapPin, Search, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../components/MapView.css"; // Import MapView CSS for dark theme support
import { reportAPI, uploadAPI } from '../services/api';

const CATEGORIES = [
  'Water Supply',
  'Architectural Barriers',
  'Sewer System',
  'Public Lighting',
  'Waste',
  'Road Signs',
  'Roads and Urban Furnishings',
  'Public Green Areas',
  'Other'
];

// Mappa le categorie agli ID (basato sullo swagger)
const CATEGORY_TO_ID = {
  'Water Supply': 1,
  'Architectural Barriers': 2,
  'Sewer System': 3,
  'Public Lighting': 4,
  'Waste': 5,
  'Road Signs': 6,
  'Roads and Urban Furnishings': 7,
  'Public Green Areas': 8,
  'Other': 9
};

// Create custom user icon (pin) for the report location
const createUserIcon = () => {
  return L.divIcon({
    html: `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
          fill="#000000" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `,
    className: 'custom-user-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Component to handle map clicks and update position
function LocationMarker({ position, setPosition, setAddress, address, setSearchQuery, setSearchResults }) {
  const markerRef = useRef(null);
  
  useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
      
      // Pulisce la barra di ricerca quando si clicca sulla mappa
      if (setSearchQuery) setSearchQuery('');
      if (setSearchResults) setSearchResults([]);
      
      // Open popup automatically
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 100);
    },
  });

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
          const newPos = [pos.lat, pos.lng];
          setPosition(newPos);
          fetchAddress(pos.lat, pos.lng, setAddress);
          marker.openPopup();
        },
      }}
    >
      <Popup className="custom-popup" maxWidth={280}>
        <div className="bg-white dark:bg-black rounded-lg p-2.5 shadow-lg" style={{ minWidth: '200px' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
            <p className="text-xs font-bold text-foreground leading-tight flex-1">
              {address || 'Selected Location'}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground pl-5">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

// Component to position zoom control in bottom right
function ZoomControl() {
  const map = useMapEvents({});
  const controlRef = useRef(null);
  
  useEffect(() => {
    // Remove any existing zoom control first
    if (controlRef.current) {
      try {
        map.removeControl(controlRef.current);
      } catch (e) {
        // Control might already be removed
      }
    }
    
    // Add new zoom control in bottom right (CSS handles positioning)
    controlRef.current = L.control.zoom({ position: 'bottomright' });
    controlRef.current.addTo(map);
    
    return () => {
      if (controlRef.current) {
        try {
          map.removeControl(controlRef.current);
        } catch (e) {
          // Control might already be removed
        }
      }
    };
  }, [map]);
  
  return null;
}

// Component to fly to position when it changes
function MapUpdater({ position }) {
  const map = useMap();
  const prevPosition = useRef(null);
  
  useEffect(() => {
    // Check if position actually changed
    if (!position || !Array.isArray(position) || position.length !== 2) {
      return;
    }
    
    // Validate coordinates
    if (isNaN(position[0]) || isNaN(position[1]) || 
        position[0] === null || position[1] === null) {
      console.error('Invalid position in MapUpdater:', position);
      return;
    }
    
    // Check if this is a real position change
    const posKey = `${position[0]},${position[1]}`;
    const prevKey = prevPosition.current ? `${prevPosition.current[0]},${prevPosition.current[1]}` : null;
    
    if (posKey === prevKey) {
      return; // Position hasn't changed, skip update
    }
    
    prevPosition.current = position;
    
    try {
      // Use setView with slower animation - more stable than flyTo
      if (map && map.setView) {
        map.setView(position, 15, {
          animate: true,
          duration: 1.5 // Slower, smoother animation
        });
      }
    } catch (error) {
      console.error('Error in setView:', error, 'position:', position);
    }
  }, [position, map]);
  
  return null;
}

// Fetch address from coordinates
const fetchAddress = async (lat, lng, setAddress) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
    );
    const data = await res.json();
    const road = data.address?.road || data.address?.pedestrian || "";
    const houseNumber = data.address?.house_number || "";
    const address = `${road} ${houseNumber}`.trim() || data.display_name || "";
    setAddress(address);
    return address;
  } catch (error) {
    console.error(error);
    return "";
  }
};

export default function CreateReport() {
  console.log('CreateReport component rendering...');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  console.log('User:', user);
  console.log('Location state:', location.state);
  
  // State for map and location
  const [mapPosition, setMapPosition] = useState([45.0703, 7.6869]); // Turin default position
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
  const [formData, setFormData] = useState({
    location: '',
    category: '',
    title: '',
    description: '',
    anonymous: false,
    photos: [],
    email: '',
    address: '',
    latitude: null,
    longitude: null,
  });
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  // Detect if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize email from user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user]);

  // Get coordinates from navigation state (if coming from Home page pin click)
  useEffect(() => {
    console.log('Checking location.state:', location.state);
    if (location.state?.coordinates) {
      const coords = location.state.coordinates;
      console.log('Received coordinates:', coords);
      
      // Check if coordinates is an array [lat, lng] or object {lat, lng}
      let lat, lng;
      if (Array.isArray(coords)) {
        [lat, lng] = coords;
      } else {
        lat = coords.lat;
        lng = coords.lng;
      }
      
      console.log('Parsed coordinates:', { lat, lng });
      
      setMapPosition([lat, lng]);
      fetchAddress(lat, lng, (address) => {
        setFormData(prev => ({ 
          ...prev, 
          address,
          location: address,
          latitude: lat,
          longitude: lng
        }));
      });
    } else {
      // Default position (Turin center)
      setMapPosition([45.0703, 7.6869]);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleAnonymousToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      anonymous: checked,
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - formData.photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      const newPhotos = [...formData.photos, ...filesToAdd];
      setFormData((prev) => ({
        ...prev,
        photos: newPhotos,
      }));

      // Create preview URLs
      const newPreviewUrls = filesToAdd.map((file) => URL.createObjectURL(file));
      setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };

  const handleRemovePhoto = (index) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index]);

    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoClick = (index) => {
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
    setImageScale(1);
  };

  const handlePreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photoPreviewUrls.length - 1 : prev - 1));
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photoPreviewUrls.length - 1 ? 0 : prev + 1));
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handlePhotoViewerKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      handlePreviousPhoto();
    } else if (e.key === 'ArrowRight') {
      handleNextPhoto();
    }
  };

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch handlers for swipe, pan, and pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for pan or swipe
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      
      // If zoomed, enable panning
      if (imageScale > 1) {
        setIsPanning(true);
      }
    } else if (e.touches.length === 2) {
      // Two touches - prepare for pinch-to-zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setLastScale(imageScale);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      // Single touch - handle pan or swipe detection
      const touch = e.touches[0];
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      
      // If zoomed and panning, update pan position
      if (imageScale > 1 && isPanning) {
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        setImagePan({ x: deltaX, y: deltaY });
        e.preventDefault(); // Prevent scrolling while panning
      }
    } else if (e.touches.length === 2) {
      // Two touches - handle pinch-to-zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      
      if (initialPinchDistance > 0) {
        const scale = (distance / initialPinchDistance) * lastScale;
        // Limit scale between 1x and 4x
        const newScale = Math.min(Math.max(scale, 1), 4);
        setImageScale(newScale);
        
        // Reset pan if zoomed out to 1x
        if (newScale === 1) {
          setImagePan({ x: 0, y: 0 });
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      // All touches released
      if (!touchStart.x || !touchEnd.x) {
        setIsPanning(false);
        setInitialPinchDistance(0);
        return;
      }
      
      // Only swipe if not zoomed
      if (imageScale === 1) {
        const distance = touchStart.x - touchEnd.x;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        
        if (isLeftSwipe && photoPreviewUrls.length > 1) {
          handleNextPhoto();
        }
        if (isRightSwipe && photoPreviewUrls.length > 1) {
          handlePreviousPhoto();
        }
      }
      
      setIsPanning(false);
      setTouchStart({ x: 0, y: 0 });
      setTouchEnd({ x: 0, y: 0 });
      setInitialPinchDistance(0);
    }
  };

  const handleClosePhotoViewer = () => {
    setShowPhotoViewer(false);
    setImageScale(1);
    setImagePan({ x: 0, y: 0 });
    setLastScale(1);
  };

  // Double click/tap fallback for zoom (useful for desktop and simulators)
  const handleImageDoubleClick = () => {
    if (imageScale === 1) {
      setImageScale(2);
      setLastScale(2);
    } else {
      setImageScale(1);
      setImagePan({ x: 0, y: 0 });
      setLastScale(1);
    }
  };

  // Search functionality for map (with auto-suggestions like Home)
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Search with debounce
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json` +
          `&q=${encodeURIComponent(value + ', Torino')}` +
          `&addressdetails=1` +
          `&limit=30` +
          `&countrycodes=it` +
          `&dedupe=1`
        );
        const results = await res.json();
        
        // Filter and prioritize streets (same logic as Home/MapView)
        const filteredResults = results
          .filter(result => {
            const isTurin = (result.address?.city === 'Torino' || 
                            result.address?.town === 'Torino' ||
                            result.address?.municipality === 'Torino')
            
            if (!isTurin) return false;
            
            const excludeTypes = ['shop', 'bar', 'restaurant', 'cafe', 'fast_food', 'pub', 
                                 'bank', 'pharmacy', 'supermarket', 'mall', 'motorway'];
            const isExcluded = excludeTypes.includes(result.type) || 
                              (result.class === 'shop') ||
                              (result.type === 'motorway');
            
            return !isExcluded;
          })
          .sort((a, b) => {
            const searchLower = value.toLowerCase();
            const aRoad = (a.address?.road || '').toLowerCase();
            const bRoad = (b.address?.road || '').toLowerCase();
            
            const aStarts = aRoad.startsWith(searchLower) || aRoad.includes(' ' + searchLower);
            const bStarts = bRoad.startsWith(searchLower) || bRoad.includes(' ' + searchLower);
            
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            const aHasRoad = a.address?.road;
            const bHasRoad = b.address?.road;
            
            if (aHasRoad && !bHasRoad) return -1;
            if (!aHasRoad && bHasRoad) return 1;
            
            return 0;
          })
          .slice(0, 5);
        
        if (filteredResults.length > 0 || searchResults.length === 0) {
          setSearchResults(filteredResults);
          setShowSearchResults(filteredResults.length > 0);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 250);
  };

  const handleSearchResultClick = (result) => {
    // Validate coordinates before using them
    if (!result.lat || !result.lon) {
      console.error('Missing coordinates in search result:', result);
      return;
    }
    
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // Validate parsed coordinates
    if (isNaN(lat) || isNaN(lon) || lat === null || lon === null) {
      console.error('Invalid coordinates from search result:', { lat, lon, result });
      return;
    }
    
    const newPos = [lat, lon];
    setMapPosition(newPos);
    setFormData(prev => ({
      ...prev,
      address: result.display_name,
      location: result.display_name,
      latitude: lat,
      longitude: lon
    }));
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Geolocation functionality
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Validate coordinates
          if (!isNaN(lat) && !isNaN(lng) && lat !== null && lng !== null) {
            const newPos = [lat, lng];
            setMapPosition(newPos);
            fetchAddress(lat, lng, (address) => {
              setFormData(prev => ({
                ...prev,
                address: address,
                location: address,
                latitude: lat,
                longitude: lng
              }));
            });
          } else {
            console.error('Invalid geolocation coordinates:', { lat, lng });
            alert('Unable to get valid coordinates.');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If anonymous, show confirmation dialog
    if (formData.anonymous) {
      setShowAnonymousDialog(true);
    } else {
      submitReport();
    }
  };

  const submitReport = async () => {
    try {
      console.log('Starting report submission...');
      console.log('Form data:', formData);
      
      // Validazione base
      if (!formData.title || !formData.category || !formData.latitude || !formData.longitude) {
        alert('Please fill in all required fields (location, category, title)');
        return;
      }
      
      // Il backend richiede una descrizione obbligatoria
      if (!formData.description || !formData.description.trim()) {
        alert('Description is required');
        return;
      }

      // 1. Prima carica le foto (se presenti)
      let photoUrls = [];
      if (formData.photos && formData.photos.length > 0) {
        console.log('Uploading photos...');
        const uploadResponse = await uploadAPI.uploadPhotos(formData.photos);
        photoUrls = uploadResponse.data.files.map(file => file.url);
        console.log('Photos uploaded:', photoUrls);
      } else {
        // Il backend richiede almeno 1 foto
        alert('At least one photo is required');
        return;
      }

      // 2. Converti la categoria in categoryId
      const categoryId = CATEGORY_TO_ID[formData.category];
      if (!categoryId) {
        throw new Error('Invalid category selected');
      }
      console.log('Category:', formData.category, '-> ID:', categoryId);

      // 3. Prepara i dati del report con gli URL delle foto
      const reportData = {
        title: formData.title,
        description: formData.description,
        categoryId: categoryId,
        latitude: formData.latitude,
        longitude: formData.longitude,
        anonymous: formData.anonymous || false,
        photos: photoUrls,
      };
      
      console.log('Sending report data to backend:', reportData);

      // 4. Chiama l'API per creare il report
      const response = await reportAPI.create(reportData);
      
      console.log('Report created successfully:', response.data);
      
      // Show success message
      alert('Report submitted successfully!');
      
      // Close dialog if open
      setShowAnonymousDialog(false);
      
      // Navigate to home or dashboard
      navigate('/');
    } catch (error) {
      console.error('Error submitting report:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to submit report. Please try again.';
      alert(errorMessage);
      setShowAnonymousDialog(false);
    }
  };

  const handleAnonymousConfirm = () => {
    submitReport();
  };

  const handleAnonymousCancel = () => {
    setShowAnonymousDialog(false);
  };

  // Component for photo upload button (mobile)
  const MobilePhotoUpload = () => {
    const hasPhotos = formData.photos.length > 0;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {hasPhotos ? (
            <Button 
              type="button" 
              size="icon" 
              className="rounded-full h-12 w-12"
            >
              <Camera className="h-5 w-5" />
            </Button>
          ) : (
            <Button type="button" variant="outline" size="lg" className="gap-2">
              <Camera className="h-5 w-5" />
              Add Photo
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-camera')?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            Camera
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-library')?.click()}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Photo Library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => document.getElementById('photo-file')?.click()}>
            <File className="mr-2 h-4 w-4" />
            File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Component for photo upload button (desktop)
  const DesktopPhotoUpload = () => (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="gap-2"
      onClick={() => document.getElementById('photo-upload')?.click()}
    >
      <Upload className="h-5 w-5" />
      Add Photo
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
            <p className="text-sm text-muted-foreground">
              <strong>ATTENTION:</strong> Participium is a system to report urban maintenance issues and not emergencies that require immediate intervention.
              In case of fires it is essential to contact the competent authorities such as Firefighters, Police, etc.
              If necessary therefore in case of temporary intervention, we advise you not to proceed with this report but to contact the relevant services.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Map Button - Mobile Only */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowMapDialog(true)}
                className="w-full bg-card border rounded-lg p-4 flex items-center gap-3 hover:bg-accent transition-colors text-left"
              >
                <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {formData.address || 'Report location point'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.address ? 'Tap to change location' : 'Click to select location on map'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {/* Map Section - Desktop Only */}
            {!isMobile && (
              <div className="bg-card border rounded-lg overflow-hidden">
                {/* Map with Search */}
                <div className={`relative ${theme === 'dark' ? 'dark-map' : ''}`} style={{ height: '500px' }}>
                  <MapContainer
                    center={[45.0703, 7.6869]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <ZoomControl />
                      <MapUpdater position={mapPosition} />
                      <LocationMarker 
                        position={mapPosition} 
                        setPosition={setMapPosition}
                        setAddress={(address) => setFormData(prev => ({ 
                          ...prev, 
                          address,
                          location: address,
                          latitude: mapPosition[0],
                          longitude: mapPosition[1]
                        }))}
                        address={formData.address}
                        setSearchQuery={setSearchQuery}
                        setSearchResults={setSearchResults}
                      />
                    </MapContainer>
                  
                  {/* Search Bar Overlay */}
                  <div className="absolute top-4 left-4 right-4 z-[1000]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search for an address..."
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        className="pl-10 pr-10 bg-white dark:bg-gray-900 shadow-lg"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    
                    {/* Search Results */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0"
                          >
                            <p className="text-sm font-medium">{result.display_name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Geolocation Button - Bottom Left */}
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                    title="Use my location"
                  >
                    <Crosshair className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Map Info Bar */}
                <div className="p-4 bg-background border-t flex items-center gap-3">
                  <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {formData.address || 'Click on the map to select a location'}
                    </p>
                    {mapPosition && (
                      <p className="text-xs text-muted-foreground">
                        {mapPosition[0].toFixed(6)}, {mapPosition[1].toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Information Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Information</h2>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Select location on map"
                  value={formData.location}
                  readOnly
                  className="bg-muted cursor-default"
                  required
                />
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title of the report *</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Brief description (max 200 characters)"
                  maxLength={200}
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed description of the report (max 2000 characters)"
                  maxLength={2000}
                  rows={6}
                  value={formData.description}
                  onChange={handleChange}
                  className="resize-none"
                  required
                />
              </div>
            </div>

            {/* Photos Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Photos</h2>

              {/* Photo previews */}
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handlePhotoClick(index)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <div className={`flex ${formData.photos.length > 0 ? 'justify-end' : 'justify-center'}`}>
                {formData.photos.length < 3 && (
                  <>
                    {isMobile ? <MobilePhotoUpload /> : <DesktopPhotoUpload />}
                    
                    {/* Hidden file inputs */}
                    {isMobile ? (
                      <>
                        <input
                          id="photo-camera"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                        <input
                          id="photo-library"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                        <input
                          id="photo-file"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          multiple
                        />
                      </>
                    ) : (
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        multiple
                      />
                    )}
                  </>
                )}
              </div>

              {formData.photos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  No photos added yet
                </p>
              )}
              {formData.photos.length > 0 && (
                <p className="text-sm text-muted-foreground text-right">
                  {formData.photos.length} of 3 photos uploaded
                </p>
              )}
            </div>

            {/* User Section */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">User</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={user.firstName || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={user.lastName || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous" className="text-base">
                    Do you want to send this report anonymously?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Your personal information will not be visible to other users
                  </p>
                </div>
                <Switch
                  id="anonymous"
                  checked={formData.anonymous}
                  onCheckedChange={handleAnonymousToggle}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button type="submit" size="lg" className="px-12">
                Submit Report
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              * Required field
            </p>
          </form>
        </div>
      </div>

      {/* Anonymous Confirmation Dialog */}
      <Dialog open={showAnonymousDialog} onOpenChange={setShowAnonymousDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymous Report</DialogTitle>
            <DialogDescription>
              You are submitting this report anonymously, are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleAnonymousCancel}>
              No
            </Button>
            <Button onClick={handleAnonymousConfirm}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={showPhotoViewer} onOpenChange={handleClosePhotoViewer}>
        <DialogContent 
          className="max-w-4xl w-full p-0 bg-black/99 border-0"
          onKeyDown={handlePhotoViewerKeyDown}
        >
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          <DialogDescription className="sr-only">
            View and navigate through uploaded photos. Use arrow keys or swipe to navigate.
          </DialogDescription>
          <div 
            className="relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={handleClosePhotoViewer}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Image counter */}
            {photoPreviewUrls.length > 1 && (
              <div className="absolute top-4 left-4 z-10 bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {currentPhotoIndex + 1} / {photoPreviewUrls.length}
              </div>
            )}

            {/* Main image */}
            <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-hidden">
              <img
                src={photoPreviewUrls[currentPhotoIndex]}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                style={{ 
                  transform: `scale(${imageScale}) translate(${imagePan.x / imageScale}px, ${imagePan.y / imageScale}px)`,
                  cursor: imageScale > 1 ? 'move' : 'default',
                  touchAction: 'none' // Prevent default touch actions
                }}
                onDoubleClick={handleImageDoubleClick}
              />
            </div>

            {/* Navigation buttons */}
            {photoPreviewUrls.length > 1 && (
              <>
                <button
                  onClick={handlePreviousPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            {photoPreviewUrls.length > 1 && (
              <div className="flex gap-2 p-4 justify-center bg-black/20">
                {photoPreviewUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentPhotoIndex(index);
                      setImageScale(1);
                      setImagePan({ x: 0, y: 0 });
                    }}
                    className={`relative w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Zoom hint */}
            {imageScale === 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                {isMobile ? 'Pinch to zoom' : 'Double click to zoom'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Dialog - Mobile Only */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0">
          <DialogTitle className="sr-only">Select Report Location</DialogTitle>
          <DialogDescription className="sr-only">
            Choose the location of your report on the map
          </DialogDescription>
          
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b bg-background">
              <h2 className="text-lg font-semibold">Report location point</h2>
            </div>

            {/* Map with Search */}
            <div className={`flex-1 relative ${theme === 'dark' ? 'dark-map' : ''}`}>
              <MapContainer
                center={[45.0703, 7.6869]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <ZoomControl />
                  <MapUpdater position={mapPosition} />
                  <LocationMarker 
                    position={mapPosition} 
                    setPosition={setMapPosition}
                    setAddress={(address) => setFormData(prev => ({ 
                      ...prev, 
                      address,
                      location: address,
                      latitude: mapPosition[0],
                      longitude: mapPosition[1]
                    }))}
                    address={formData.address}
                    setSearchQuery={setSearchQuery}
                    setSearchResults={setSearchResults}
                  />
                </MapContainer>
              
              {/* Search Bar Overlay */}
              <div className="absolute top-4 left-4 right-4 z-[1000]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for an address..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="pl-10 pr-10 bg-white dark:bg-gray-900 shadow-lg"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                
                {/* Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-b-0"
                      >
                        <p className="text-sm font-medium">{result.display_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Geolocation Button - Bottom Left */}
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                title="Use my location"
              >
                <Crosshair className="h-5 w-5" />
              </button>
            </div>

            {/* Confirm Button */}
            <div className="p-4 border-t bg-background space-y-2">
              {formData.address && (
                <p className="text-sm text-center text-foreground font-bold leading-snug">
                  {formData.address}
                </p>
              )}
              <Button 
                onClick={() => setShowMapDialog(false)} 
                className="w-full"
                size="lg"
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  }
