import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search } from "lucide-react";

export function MapView() {
  const mapRef = useRef(null);
  const [markerPosition, setMarkerPosition] = useState([45.0703, 7.6869]); // Turin
  const [address, setAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Show temporary error messages
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 4000);
  };

  // Format short address (road + house number)
  const formatAddress = (addr) => {
    if (!addr) return "";
    const road = addr.road || addr.pedestrian || "";
    const houseNumber = addr.house_number || "";
    return `${road} ${houseNumber}`.trim();
  };

  useEffect(() => {
    if (!mapRef.current || mapRef.current._leaflet_id) return;

    const map = L.map(mapRef.current).setView(markerPosition, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add a draggable marker
    const marker = L.marker(markerPosition, { draggable: true }).addTo(map);

    // Update state when the user moves the marker
    marker.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      setMarkerPosition([lat, lng]);
      fetchAddress(lat, lng);
    });

    // Add or move the marker when the user clicks on the map
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setMarkerPosition([lat, lng]);
      fetchAddress(lat, lng);
    });

    mapRef.current.mapInstance = map;
    mapRef.current.markerInstance = marker;

    return () => map.remove();
  }, []);

  // Reverse geocoding
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();

      const shortAddress = formatAddress(data.address);
      setAddress(shortAddress || data.display_name || "");
    } catch (error) {
      console.error(error);
      showError("Error fetching address");
    }
  };

  // Search for address based on input
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      let query = address.trim();
      const match = query.match(/^(\d+)\s+(.*)/);
      if (match) {
        query = `${match[2]}, ${match[1]}`;
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`
      );

      const results = await res.json();
      if (results.length === 0) {
        showError("Indirizzo non trovato");
        return;
      }
      const selected =
        results.find((r) => r.address?.road || r.address?.pedestrian) ||
        results[0];
      const { lat, lon, display_name, address: addr } = selected;

      const newPos = [parseFloat(lat), parseFloat(lon)];
      setMarkerPosition(newPos);
      mapRef.current.mapInstance.setView(newPos, 15);
      mapRef.current.markerInstance.setLatLng(newPos);

      const shortAddress = formatAddress(addr);
      setAddress(shortAddress || display_name);
    } catch (error) {
      console.error(error);
      showError("Error during search");
    }
  };

  useEffect(() => {
    if (mapRef.current?.markerInstance) {
      mapRef.current.markerInstance.setLatLng(markerPosition);
    }
  }, [markerPosition]);

  return (
    <div className="relative w-full h-full">
      {/* Error Message */}
      {errorMessage && (
        <div className="absolute top-24 right-6 z-[1000] bg-red-500 text-white px-4 py-2 rounded shadow">
          {errorMessage}
        </div>
      )}

      {/* Search Box */}
      <form
        onSubmit={handleSearch}
        className="absolute top-6 right-6 z-[1000] bg-background/95 backdrop-blur-md border border-border
                rounded-2xl shadow-lg px-6 py-3 flex items-center gap-3 w-[450px] transition-all focus-within:ring-2
                focus-within:ring-primary"
      >
        <Search className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search for an address..."
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
        />
      </form>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-full min-h-screen"
        minHeight="100vh"
      />
    </div>
  );
}
