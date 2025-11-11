import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function MapView() {
  const mapRef = useRef(null);
  const [markerPosition, setMarkerPosition] = useState([45.0703, 7.6869]); // Turin

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
    });

    // Add or move the marker when the user clicks on the map
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setMarkerPosition([lat, lng]);
    });

    mapRef.current.mapInstance = map;
    mapRef.current.markerInstance = marker;

    return () => map.remove();
  }, []);

  useEffect(() => {
    if (mapRef.current?.markerInstance) {
      mapRef.current.markerInstance.setLatLng(markerPosition);
    }
  }, [markerPosition]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "100vh" }}
    />
  );
}
