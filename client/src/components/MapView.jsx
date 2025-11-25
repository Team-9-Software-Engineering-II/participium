import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";
import { Search, Info, MapPin, Crosshair, X, AlertTriangle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isPointInTurin, fetchTurinBoundary } from "@/lib/geoUtils";

const REPORT_STATUS = {
  "Pending Approval": { color: '#3B82F6', label: 'Pending Approval', icon: '●' }, // Blu
  "Assigned": { color: '#F59E0B', label: 'Assigned', icon: '●' }, // Arancione
  "In Progress": { color: '#EAB308', label: 'In Progress', icon: '●' }, // Giallo
  "Resolved": { color: '#10B981', label: 'Resolved', icon: '●' }, // Verde
  "Suspended": { color: '#EF4444', label: 'Suspended', icon: '●' }, // Rosso
  "Rejected": { color: '#6B7280', label: 'Rejected', icon: '●' }    // Grigio
};

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

const createReportIcon = (status) => {
  const statusInfo = REPORT_STATUS[status] || REPORT_STATUS["Pending Approval"];
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

// --- COMPONENTI MAPPA ---

function ZoomControl() {
  const map = useMap();
  const controlRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Rimuovi eventuali controlli zoom esistenti per evitare duplicati
    if (controlRef.current) {
      try { map.removeControl(controlRef.current); } catch (e) {}
    }
    
    // Crea il controllo nativo
    // Su mobile lo mettiamo a sinistra (bottomleft)
    // Su desktop a destra (bottomright)
    const position = isMobile ? 'bottomleft' : 'bottomright';
    
    controlRef.current = L.control.zoom({ position });
    controlRef.current.addTo(map);

    return () => {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch (e) {}
      }
    };
  }, [map, isMobile]);

  return null;
}

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (!position || !Array.isArray(position) || position.length !== 2) return;
    const lat = parseFloat(position[0]);
    const lng = parseFloat(position[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (lat === DEFAULT_CENTER[0] && lng === DEFAULT_CENTER[1]) return;

    // Usa setView per stabilità massima
    map.setView([lat, lng], 16, { animate: true, duration: 1.5 }); 

  }, [position, map]);
  return null;
}

function LocationMarker({ position, setPosition, setAddress, address, setSearchQuery, setSearchResults, setShowSearchResults, turinGeoJSON }) {
  const navigate = useNavigate();
  const markerRef = useRef(null);
  const [isInsideBoundary, setIsInsideBoundary] = useState(true);

  useEffect(() => {
    if (!position || !turinGeoJSON) return;

    const inside = isPointInTurin(position[0], position[1], turinGeoJSON);
    setIsInsideBoundary(inside);

    // FIX F5 POPUP: Controlla se siamo esattamente sulla posizione di default
    const isDefault = position[0] === DEFAULT_CENTER[0] && position[1] === DEFAULT_CENTER[1];

    // Se NON siamo nella posizione di default (quindi l'utente ha cliccato o cercato), apri il popup
    if (markerRef.current && !isDefault) {
      markerRef.current.openPopup();
    }

    if (inside) {
      // Non fetchare l'indirizzo se siamo fermi al default (evita chiamate inutili all'avvio)
      if (!isDefault) {
         fetchAddress(position[0], position[1], setAddress);
      }
    } else {
      setAddress("Area not supported");
    }
  }, [position, turinGeoJSON, setAddress]);

  const handleMapClick = (lat, lng) => {
    setPosition([lat, lng]);
    if (setSearchQuery) setSearchQuery('');
    if (setSearchResults) setSearchResults([]);
    if (setShowSearchResults) setShowSearchResults(false);
  };

  useMapEvents({ click(e) { handleMapClick(e.latlng.lat, e.latlng.lng); } });

  return position === null ? null : (
    <Marker position={position} icon={createUserIcon()} draggable={true} ref={markerRef} eventHandlers={{ dragend: (e) => { const marker = e.target; const pos = marker.getLatLng(); setPosition([pos.lat, pos.lng]); } }}>
      <Popup className="custom-popup" maxWidth={220}>
        <div className="bg-background border border-border text-foreground rounded-lg p-2.5 shadow-lg" style={{ minWidth: '200px' }}>
          {isInsideBoundary ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5"><MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />{address && <p className="text-xs font-semibold leading-tight">{address}</p>}</div>
              <p className="text-[10px] text-muted-foreground mb-2 ml-5">{position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
              <Button onClick={() => navigate('/reports/new', { state: { coordinates: position, address: address || null } })} className="w-full h-7 text-xs" size="sm">+ New Report</Button>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-1">
              <div className="bg-destructive/10 p-2 rounded-full mb-2"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <p className="text-xs font-bold text-destructive mb-1">Area Not Supported</p>
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
  useEffect(() => { 
      if (selectedReport && selectedReport.latitude && selectedReport.longitude) {
          const lat = parseFloat(selectedReport.latitude);
          const lng = parseFloat(selectedReport.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
             map.setView([lat, lng], 16, { animate: true, duration: 1.5 }); 
          }
      }
  }, [selectedReport, map]);
  return null;
}

// --- MAIN COMPONENT ---

export function MapView({ reports = [], selectedReport = null }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [position, setPosition] = useState(DEFAULT_CENTER); 
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [turinGeoJSON, setTurinGeoJSON] = useState(null);
  
  const isSearching = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTurinBoundary();
      if (data) setTurinGeoJSON(data);
    };
    loadData();
  }, []);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
        },
        (error) => { console.error("Geolocation error:", error); alert("Unable to retrieve your location. Please check permissions."); }
      );
    } else { alert("Geolocation is not supported by your browser."); }
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
        isSearching.current = true;
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
    isSearching.current = true;
    setPosition([parseFloat(result.lat), parseFloat(result.lon)]);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
  };

  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); };

  return (
    <div className="relative w-full h-full">
      {/* STYLE INJECTION: High Specificity to override index.css !important */}
      <style>{`
        /* Desktop: Alto a destra (sovrascrive il bottom: 2px di index.css) */
        @media (min-width: 769px) {
          #root .leaflet-container .leaflet-bottom.leaflet-right {
            bottom: auto !important;
            top: 790px !important; /* Posizionato in alto a destra, sotto la navbar */
            right: 10px !important;
          }
          /* Reset top position for attribution to stay at bottom */
          #root .leaflet-container .leaflet-control-attribution {
            top: auto !important;
          }
        }
        /* Mobile: Basso a sinistra, sopra il bottone Info */
        @media (max-width: 768px) {
          #root .leaflet-container .leaflet-bottom.leaflet-left {
            bottom: 140px !important; 
            left: 12px !important;
            right: auto !important;
          }
          /* Nascondi controlli desktop se presenti */
          #root .leaflet-container .leaflet-bottom.leaflet-right {
            display: none;
          }
        }
      `}</style>

      <div className="absolute top-6 right-6 z-[1000] w-[450px] max-md:left-4 max-md:right-4 max-md:w-auto max-md:top-4">
        <form onSubmit={handleSearch} className="bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-lg px-6 py-3 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-primary max-md:px-4 max-md:py-2">
          <Search className="h-6 w-6 text-muted-foreground flex-shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => handleSearchInput(e.target.value)} placeholder="Search address..." className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground" />
          {searchQuery && <button type="button" onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors max-md:hidden" title="Clear search"><X className="h-5 w-5" /></button>}
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
        {/* FIX ZOOM: Default 12 */}
        <MapContainer center={DEFAULT_CENTER} zoom={15} className="w-full h-full" zoomControl={false} preferCanvas={true}>
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
              <Marker 
                key={report.id} 
                position={[report.latitude, report.longitude]} 
                icon={createReportIcon(report.status)}
                eventHandlers={{
                  click: () => {
                    navigate(`/reports/${report.id}`);
                  }
                }}
              >
                {/* Popup rimosso per permettere la navigazione diretta */}
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}