import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";
import { Search, Info, MapPin, Crosshair, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isPointInTurin, fetchTurinBoundary } from "@/lib/geoUtils";

const REPORT_STATUS = {
  TO_ASSIGN: { color: '#3B82F6', label: 'To Assign', icon: '●' },
  ASSIGNED: { color: '#F59E0B', label: 'Assigned', icon: '●' },
  IN_PROGRESS: { color: '#EAB308', label: 'In Progress', icon: '●' },
  COMPLETED: { color: '#10B981', label: 'Completed', icon: '●' }
};

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

const createReportIcon = (status) => {
  const statusInfo = REPORT_STATUS[status] || REPORT_STATUS.TO_ASSIGN;
  return L.divIcon({
    className: 'custom-report-marker',
    html: `<div style="width: 30px; height: 30px; background-color: ${statusInfo.color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

const createClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  let color = count < 10 ? '#10B981' : count < 25 ? '#EAB308' : count < 50 ? '#F59E0B' : count < 100 ? '#EF4444' : '#991B1B';
  return L.divIcon({
    html: `<div style="width: 50px; height: 50px; background-color: ${color}; border: 4px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(50, 50, true),
  });
};

const fetchAddress = async (lat, lng, setAddress) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
    const data = await res.json();
    const road = data.address?.road || data.address?.pedestrian || data.address?.street || "";
    const houseNumber = data.address?.house_number || "";
    let formattedAddress = `${road} ${houseNumber}`.trim();
    if (!formattedAddress) formattedAddress = data.name || data.display_name || "Address not available";
    setAddress(formattedAddress);
    return formattedAddress;
  } catch (error) { console.error(error); return ""; }
};

function ZoomControl() {
  const map = useMap();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    if (containerRef.current) { L.DomEvent.disableClickPropagation(containerRef.current); L.DomEvent.disableScrollPropagation(containerRef.current); }
  }, []);
  return (
    <div ref={containerRef} className="absolute z-[1000] shadow-md" style={isMobile ? { bottom: '200px', left: '21px' } : { bottom: '130px', right: '10px' }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomIn(); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} className="bg-white border border-gray-300 w-[30px] h-[30px] flex items-center justify-center text-[18px] font-normal hover:bg-gray-50 transition-colors cursor-pointer rounded-t" title="Zoom in" style={{ lineHeight: '26px', textAlign: 'center', textDecoration: 'none', color: '#000', }}>+</button>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); map.zoomOut(); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} className="bg-white border border-gray-300 border-t-0 w-[30px] h-[30px] flex items-center justify-center text-[18px] font-normal hover:bg-gray-50 transition-colors cursor-pointer rounded-b" title="Zoom out" style={{ lineHeight: '26px', textAlign: 'center', textDecoration: 'none', color: '#000', }}>−</button>
    </div>
  );
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

function LocationMarker({ position, setPosition, setAddress, address, setSearchQuery, setSearchResults, setShowSearchResults, turinGeoJSON }) {
  const navigate = useNavigate();
  const markerRef = useRef(null);
  const [isInsideBoundary, setIsInsideBoundary] = useState(true);
  
  // FIX: useEffect per ricalcolare 'isInsideBoundary' ogni volta che la posizione cambia
  // (ad esempio tramite Geolocation o Ricerca, non solo Click)
  useEffect(() => {
    if (position && turinGeoJSON) {
      const inside = isPointInTurin(position[0], position[1], turinGeoJSON);
      setIsInsideBoundary(inside);
      
      // Se è dentro, aggiorna l'indirizzo
      if (inside) {
        fetchAddress(position[0], position[1], setAddress);
      } else {
        setAddress("Area not supported");
      }
    }
  }, [position, turinGeoJSON, setAddress]);

  const handleMapClick = (lat, lng) => {
    setPosition([lat, lng]);
    if (setSearchQuery) setSearchQuery('');
    if (setSearchResults) setSearchResults([]);
    if (setShowSearchResults) setShowSearchResults(false);
    
    setTimeout(() => {
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }, 100);
  };

  useMapEvents({ click(e) { handleMapClick(e.latlng.lat, e.latlng.lng); } });

  return position === null ? null : (
    <Marker position={position} icon={createUserIcon()} draggable={true} ref={markerRef} eventHandlers={{ dragend: (e) => { const marker = e.target; const pos = marker.getLatLng(); setPosition([pos.lat, pos.lng]); marker.openPopup(); } }}>
      <Popup className="custom-popup" maxWidth={220}>
        <div className="bg-white dark:bg-black rounded-lg p-2.5 shadow-lg" style={{ minWidth: '200px' }}>
          {isInsideBoundary ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5"><MapPin className="h-3.5 w-3.5 text-foreground flex-shrink-0" />{address && <p className="text-xs font-semibold text-foreground leading-tight">{address}</p>}</div>
              <p className="text-[10px] text-muted-foreground mb-2 ml-5">{position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
              <Button onClick={() => navigate('/reports/new', { state: { coordinates: position, address: address || null } })} className="w-full h-7 text-xs" size="sm">+ New Report</Button>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-1">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mb-2"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">Area Not Supported</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Reports can only be created within the Municipality of Turin.</p>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function CenterOnReport({ selectedReport }) {
  const map = useMap();
  useEffect(() => { if (selectedReport && selectedReport.latitude) map.setView([selectedReport.latitude, selectedReport.longitude], 16, { animate: true, duration: 1 }); }, [selectedReport, map]);
  return null;
}

export function MapView({ reports = [], selectedReport = null }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [position, setPosition] = useState([45.0703, 7.6869]); 
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [turinGeoJSON, setTurinGeoJSON] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTurinBoundary();
      if (data) setTurinGeoJSON(data);
    };
    loadData();
  }, []);

  // FIX: Funzione Geolocation reintrodotta
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Aggiornando 'position', il LocationMarker (grazie allo useEffect) farà il controllo confini
          setPosition([lat, lng]);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to retrieve your location. Please check permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Torino')}&addressdetails=1&limit=1&countrycodes=it`);
      const results = await res.json();
      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        setPosition([lat, lon]);
        setAddress(results[0].display_name);
        setShowSearchResults(false);
      }
    } catch (error) { console.error(error); }
  };

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length < 3) { setSearchResults([]); setShowSearchResults(false); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value + ', Torino')}&addressdetails=1&limit=30&countrycodes=it&dedupe=1`);
        const results = await res.json();
        const filtered = results.filter(r => (r.address?.city === 'Torino' || r.address?.town === 'Torino')).slice(0, 5);
        setSearchResults(filtered);
        setShowSearchResults(filtered.length > 0);
      } catch (error) { console.error(error); }
    }, 250);
  };

  const selectSearchResult = (result) => {
    setPosition([parseFloat(result.lat), parseFloat(result.lon)]);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
  };

  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-6 right-6 z-[1000] w-[450px] max-md:left-4 max-md:right-4 max-md:w-auto max-md:top-4">
        <form onSubmit={handleSearch} className="bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg px-6 py-3 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-primary max-md:px-4 max-md:py-2">
          <Search className="h-6 w-6 text-muted-foreground flex-shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)} placeholder="Search address..." className="bg-transparent outline-none flex-1 text-sm" />
          {searchQuery && <button type="button" onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors max-md:hidden" title="Clear search"><X className="h-5 w-5" /></button>}
          
          {/* FIX: Aggiunto onClick al pulsante Mobile */}
          <button type="button" onClick={handleUseMyLocation} className="text-muted-foreground hover:text-foreground transition-colors md:hidden" title="Use my location"><Crosshair className="h-5 w-5" /></button>
        </form>
        {showSearchResults && searchResults.length > 0 && (
          <div className="mt-2 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((result, index) => (
              <button key={index} onClick={() => selectSearchResult(result)} className="w-full px-4 py-3 text-left text-sm hover:bg-accent border-b border-border last:border-b-0">{result.display_name}</button>
            ))}
          </div>
        )}
      </div>

      {/* FIX: Aggiunto onClick al pulsante Desktop */}
      <button onClick={handleUseMyLocation} className="absolute top-6 left-6 z-[1000] bg-background/95 backdrop-blur-md border border-border rounded-full p-3 shadow-lg hover:bg-accent transition-colors max-md:hidden" title="Use my location"><Crosshair className="h-6 w-6" /></button>
      
      <button onClick={() => setShowLegend(true)} className="absolute bottom-6 left-6 z-[2000] bg-background/95 backdrop-blur-md border border-border rounded-full p-3 shadow-lg hover:bg-accent max-md:hidden"><Info className="h-6 w-6" /></button>

      <Dialog open={showLegend} onOpenChange={setShowLegend}>
        <DialogContent className="max-w-md z-[9999]">
          <DialogHeader><DialogTitle>Legend</DialogTitle><DialogDescription>Report status legend</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><h3 className="font-semibold mb-3 text-sm">Map Selection</h3><p className="text-sm text-muted-foreground">Move the cursor or click to select.</p></div>
            <div><h3 className="font-semibold mb-3 text-sm">Status</h3><div className="space-y-3">{Object.entries(REPORT_STATUS).map(([key, value]) => (<div key={key} className="flex items-center gap-3"><div className="w-6 h-6 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: value.color }} /><span className="text-sm">{value.label}</span></div>))}</div></div>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`w-full h-screen ${theme === 'dark' ? 'dark-map' : ''}`}>
        <MapContainer center={[45.0703, 7.6869]} zoom={13} className="w-full h-full" zoomControl={false} preferCanvas={true}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {turinGeoJSON && <GeoJSON data={turinGeoJSON} style={turinBoundaryStyle} />}

          <ZoomControl />
          <MapUpdater position={position} />
          <CenterOnReport selectedReport={selectedReport} />
          
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            setAddress={setAddress} 
            address={address} 
            setSearchQuery={setSearchQuery} 
            setSearchResults={setSearchResults} 
            setShowSearchResults={setShowSearchResults} 
            turinGeoJSON={turinGeoJSON} 
          />
          
          <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} maxClusterRadius={80} spiderfyOnMaxZoom={true} showCoverageOnHover={false}>
            {reports.map((report) => (
              <Marker key={report.id} position={[report.latitude, report.longitude]} icon={createReportIcon(report.status)}>
                <Popup className="custom-popup">
                  <div className="bg-white rounded-lg p-3">
                    <h3 className="font-semibold text-sm mb-2">{report.title}</h3>
                    <p className="text-xs text-muted-foreground">Status: <span style={{ color: REPORT_STATUS[report.status]?.color }} className="font-medium">{REPORT_STATUS[report.status]?.label}</span></p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}