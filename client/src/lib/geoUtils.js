// URL ufficiale OpenPolis per i comuni della Città Metropolitana di Torino (Codice Provincia 001 -> P_1)
export const TURIN_PROVINCE_GEOJSON_URL = "https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_P_1_municipalities.geojson";

/**
 * Scarica e filtra il GeoJSON per ottenere solo i confini del Comune di Torino.
 */
export async function fetchTurinBoundary() {
  try {
    const response = await fetch(TURIN_PROVINCE_GEOJSON_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    // Trova la feature "Torino" all'interno della collezione
    // OpenPolis usa "name" nelle properties
    const turinFeature = data.features.find(
      (f) => f.properties.name.toLowerCase() === "torino"
    );

    if (!turinFeature) {
      console.error("Turin boundary not found in the downloaded dataset.");
      return null;
    }

    return turinFeature;
  } catch (error) {
    console.error("Failed to fetch Turin boundary:", error);
    return null;
  }
}

/**
 * Estrae i poligoni da qualsiasi oggetto GeoJSON (FeatureCollection, Feature, MultiPolygon, Polygon)
 */
function getPolygons(geoJson) {
  if (!geoJson) return [];

  if (geoJson.type === 'FeatureCollection') {
    return geoJson.features.flatMap(f => getPolygons(f));
  }
  if (geoJson.type === 'Feature') {
    return getPolygons(geoJson.geometry);
  }
  if (geoJson.type === 'Polygon') {
    return [geoJson.coordinates];
  }
  if (geoJson.type === 'MultiPolygon') {
    return geoJson.coordinates;
  }
  return [];
}

/**
 * Verifica se un punto (lat, lng) è dentro l'area di Torino.
 * Algoritmo Ray Casting.
 */
export function isPointInTurin(latitude, longitude, geoJsonData) {
  if (!geoJsonData) return true; // Fallback: se non carica, permetti tutto per non bloccare l'app

  const polygons = getPolygons(geoJsonData);
  let isInside = false;

  for (const polygon of polygons) {
    const ring = polygon[0]; // Anello esterno
    let x = longitude, y = latitude;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      let xi = ring[i][0], yi = ring[i][1];
      let xj = ring[j][0], yj = ring[j][1];
      
      let intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    if (inside) {
      isInside = true;
      break;
    }
  }

  return isInside;
}