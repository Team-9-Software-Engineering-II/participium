import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function MapView() {
  useEffect(() => {

    if (document.getElementById("map")?._leaflet_id) return;

    const map = L.map("map").setView([45.0703, 7.6869], 13); // Turin City Center

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.marker([45.0703, 7.6869])
      .addTo(map)
      //.bindPopup("Welcome to Participium!")
      //.openPopup();

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      id="map"
      className="w-full h-full"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}
