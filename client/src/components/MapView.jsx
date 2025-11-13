import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";
import { Search, Info, MapPin, Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Report status colors and labels
const REPORT_STATUS = {
  TO_ASSIGN: { color: '#3B82F6', label: 'To Assign', icon: '●' },
  ASSIGNED: { color: '#F59E0B', label: 'Assigned', icon: '●' },
  IN_PROGRESS: { color: '#EAB308', label: 'In Progress', icon: '●' },
  COMPLETED: { color: '#10B981', label: 'Completed', icon: '●' }
};

// Create custom user icon (pin)
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

// Create custom report marker icon
const createReportIcon = (status) => {
  const statusInfo = REPORT_STATUS[status] || REPORT_STATUS.TO_ASSIGN;
  return L.divIcon({
    className: 'custom-report-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background-color: ${statusInfo.color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Create cluster icon with gradient based on count
const createClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  let color;
  
  // Gradient from green (few) to red (many)
  if (count < 10) {
    color = '#10B981'; // green
  } else if (count < 25) {
    color = '#EAB308'; // yellow
  } else if (count < 50) {
    color = '#F59E0B'; // orange
  } else if (count < 100) {
    color = '#EF4444'; // red
  } else {
    color = '#991B1B'; // dark red
  }
  
  return L.divIcon({
    html: `
      <div style="
        width: 50px;
        height: 50px;
        background-color: ${color};
        border: 4px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(50, 50, true),
  });
};

// Component to position zoom control in bottom right
function ZoomControl() {
  const map = useMap();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Custom zoom buttons for both mobile and desktop
  return (
    <div 
      className="absolute z-[1000] shadow-md"
      style={isMobile 
        ? { bottom: '150px', left: '21px' }
        : { bottom: '80px', right: '10px' }
      }
    >
      {/* Custom Zoom In button */}
      <button
        onClick={() => map.zoomIn()}
        className="bg-white border border-gray-300
                   w-[30px] h-[30px] flex items-center justify-center text-[18px] font-normal
                   hover:bg-gray-50 transition-colors
                   cursor-pointer rounded-t"
        title="Zoom in"
        style={{
          lineHeight: '26px',
          textAlign: 'center',
          textDecoration: 'none',
          color: '#000',
        }}
      >
        +
      </button>
      
      {/* Custom Zoom Out button */}
      <button
        onClick={() => map.zoomOut()}
        className="bg-white border border-gray-300 border-t-0
                   w-[30px] h-[30px] flex items-center justify-center text-[18px] font-normal
                   hover:bg-gray-50 transition-colors
                   cursor-pointer rounded-b"
        title="Zoom out"
        style={{
          lineHeight: '26px',
          textAlign: 'center',
          textDecoration: 'none',
          color: '#000',
        }}
      >
        −
      </button>
    </div>
  );
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

// Component to handle map clicks
function LocationMarker({ position, setPosition, setAddress, address, setSearchQuery, setSearchResults, setShowSearchResults }) {
  const navigate = useNavigate();
  const markerRef = useRef(null);
  
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
      
      // Pulisce la barra di ricerca quando si clicca sulla mappa
      if (setSearchQuery) setSearchQuery('');
      if (setSearchResults) setSearchResults([]);
      if (setShowSearchResults) setShowSearchResults(false);
      
      // Open popup automatically after a short delay
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 100);
    },
  });

  return position === null ? null : (
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
          fetchAddress(pos.lat, pos.lng, setAddress);
          marker.openPopup();
        },
      }}
    >
      <Popup className="custom-popup" maxWidth={220}>
        <div className="bg-white dark:bg-black rounded-lg p-2.5 shadow-lg" style={{ minWidth: '200px' }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
            {address && address.trim() && (
              <p className="text-xs font-semibold text-foreground leading-tight">
                {address}
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mb-2 ml-5">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
          <Button 
            onClick={() => {
              navigate('/reports/new', { 
                state: { 
                  coordinates: position,
                  address: address || null
                }
              });
            }}
            className="w-full h-7 text-xs"
            size="sm"
          >
            + New Report
          </Button>
        </div>
      </Popup>
    </Marker>
  );
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

// Component to center map on selected report
function CenterOnReport({ selectedReport }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedReport && selectedReport.latitude && selectedReport.longitude) {
      map.setView([selectedReport.latitude, selectedReport.longitude], 16, {
        animate: true,
        duration: 1
      });
    }
  }, [selectedReport, map]);
  
  return null;
}

export function MapView({ reports = [], selectedReport = null }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [position, setPosition] = useState([45.0703, 7.6869]); // Turin
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // Search only in Turin city
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Torino'
        )}&addressdetails=1&limit=1&countrycodes=it`
      );
      const results = await res.json();
      
      if (results.length > 0 && results[0].lat && results[0].lon) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        
        // Validate coordinates before setting position
        if (!isNaN(lat) && !isNaN(lon) && lat !== null && lon !== null) {
          setPosition([lat, lon]);
          setAddress(results[0].display_name);
          setShowSearchResults(false);
        } else {
          console.error('Invalid coordinates from search:', { lat, lon });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

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

    // Keep showing old results while searching
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search only in Turin city (not metropolitan area)
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
        
        // Filter and prioritize streets
        const filteredResults = results
          .filter(result => {
            // Must be in Turin city only - strict check
            const isTurin = (result.address?.city === 'Torino' || 
                            result.address?.town === 'Torino' ||
                            result.address?.municipality === 'Torino')
            
            if (!isTurin) return false;
            
            // Exclude unwanted types
            const excludeTypes = ['shop', 'bar', 'restaurant', 'cafe', 'fast_food', 'pub', 
                                 'bank', 'pharmacy', 'supermarket', 'mall', 'motorway'];
            const isExcluded = excludeTypes.includes(result.type) || 
                              (result.class === 'shop') ||
                              (result.type === 'motorway');
            
            return !isExcluded;
          })
          .sort((a, b) => {
            const searchLower = value.toLowerCase();
            
            // Get street names
            const aRoad = (a.address?.road || '').toLowerCase();
            const bRoad = (b.address?.road || '').toLowerCase();
            
            // Prioritize streets that start with the search term
            const aStarts = aRoad.startsWith(searchLower) || aRoad.includes(' ' + searchLower);
            const bStarts = bRoad.startsWith(searchLower) || bRoad.includes(' ' + searchLower);
            
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            // Then prioritize results with road in address (actual streets)
            const aHasRoad = a.address?.road;
            const bHasRoad = b.address?.road;
            
            if (aHasRoad && !bHasRoad) return -1;
            if (!aHasRoad && bHasRoad) return 1;
            
            return 0;
          })
          .slice(0, 5);
        
        // Only update if we have results or current results are empty
        if (filteredResults.length > 0 || searchResults.length === 0) {
          setSearchResults(filteredResults);
          setShowSearchResults(filteredResults.length > 0);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 250);
  };

  const selectSearchResult = (result) => {
    const { lat, lon, display_name } = result;
    
    // Validate coordinates before setting position
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      if (!isNaN(latitude) && !isNaN(longitude) && latitude !== null && longitude !== null) {
        setPosition([latitude, longitude]);
        setAddress(display_name);
        setSearchQuery(display_name);
        setShowSearchResults(false);
      } else {
        console.error('Invalid coordinates from search result:', { lat, lon, latitude, longitude });
      }
    } else {
      console.error('Missing lat/lon in search result:', result);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Search Box - Desktop: top-right, Mobile: full width top */}
      <div className="absolute top-6 right-6 z-[1000] w-[450px] md:w-[450px] max-md:left-4 max-md:right-4 max-md:w-auto max-md:top-4">
        <form
          onSubmit={handleSearch}
          className="bg-background/95 backdrop-blur-md border border-border
                  rounded-2xl shadow-lg px-6 py-3 flex items-center gap-3 transition-all focus-within:ring-2
                  focus-within:ring-primary max-md:px-4 max-md:py-2"
        >
          <Search className="h-6 w-6 text-muted-foreground flex-shrink-0 max-md:h-5 max-md:w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search for an address..."
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
          {/* Clear button - only on desktop */}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors max-md:hidden"
              title="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {/* Geolocation button - only on mobile, inside search bar */}
          <button
            type="button"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    
                    // Validate coordinates
                    if (!isNaN(lat) && !isNaN(lng) && lat !== null && lng !== null) {
                      const newPos = [lat, lng];
                      setPosition(newPos);
                      fetchAddress(lat, lng, setAddress);
                    } else {
                      console.error('Invalid geolocation coordinates:', { lat, lng });
                      alert('Unable to get valid coordinates.');
                    }
                  },
                  (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please enable location services.');
                  }
                );
              } else {
                alert('Geolocation is not supported by your browser.');
              }
            }}
            className="text-muted-foreground hover:text-foreground transition-colors md:hidden"
            title="Use my location"
          >
            <Crosshair className="h-5 w-5" />
          </button>
        </form>
        
        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="mt-2 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectSearchResult(result)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-accent transition-colors border-b border-border last:border-b-0"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geolocation Button - Desktop only: Top Left */}
      <button
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                // Validate coordinates
                if (!isNaN(lat) && !isNaN(lng) && lat !== null && lng !== null) {
                  const newPos = [lat, lng];
                  setPosition(newPos);
                  fetchAddress(lat, lng, setAddress);
                } else {
                  console.error('Invalid geolocation coordinates:', { lat, lng });
                  alert('Unable to get valid coordinates.');
                }
              },
              (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable location services.');
              }
            );
          } else {
            alert('Geolocation is not supported by your browser.');
          }
        }}
        className="absolute top-6 left-6 z-[1000] bg-background/95 backdrop-blur-md border border-border
                rounded-full p-3 shadow-lg hover:bg-accent transition-colors max-md:hidden"
        title="Use my location"
      >
        <Crosshair className="h-6 w-6" />
      </button>

      {/* Info Button - Bottom Left, below zoom control */}
      <button
        onClick={() => setShowLegend(true)}
        className="absolute bottom-6 left-6 z-[1000] bg-background/95 backdrop-blur-md border border-border
                rounded-full p-3 shadow-lg hover:bg-accent transition-colors max-md:bottom-[60px] max-md:left-4"
        title="Show legend"
      >
        <Info className="h-6 w-6 max-md:h-5 max-md:w-5" />
      </button>

      {/* Legend Dialog */}
      <Dialog open={showLegend} onOpenChange={setShowLegend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Legend</DialogTitle>
            <DialogDescription>
              Report status legend
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold mb-3 text-sm">How to select a point on the map</h3>
              <p className="text-sm text-muted-foreground">
                Move the cursor or click on a point on the map
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Report status legend</h3>
              <div className="space-y-3">
                {Object.entries(REPORT_STATUS).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: value.color }}
                    />
                    <span className="text-sm">{value.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map */}
      <div className={`w-full h-screen ${theme === 'dark' ? 'dark-map' : ''}`}>
        <MapContainer
          center={[45.0703, 7.6869]}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
          preferCanvas={true}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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
        />
        
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={80}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={createReportIcon(report.status)}
            >
              <Popup className="custom-popup">
                <div className="bg-white rounded-lg p-3">
                  <h3 className="font-semibold text-sm mb-2">{report.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Status: <span style={{ color: REPORT_STATUS[report.status]?.color || '#666' }} className="font-medium">
                      {REPORT_STATUS[report.status]?.label || report.status}
                    </span>
                  </p>
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
