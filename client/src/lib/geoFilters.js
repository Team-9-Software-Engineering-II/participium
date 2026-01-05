/**
 * Utility functions for geographic filtering of reports
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if an address contains a specific street name
 * @param {string} reportAddress - Full address from report
 * @param {string} searchStreet - Street name to search for
 * @returns {boolean} True if the street name is found in the address
 */
export function isReportOnStreet(reportAddress, searchStreet) {
  if (!reportAddress || !searchStreet) return false;
  
  // Normalize both strings for comparison
  const normalizedAddress = reportAddress.toLowerCase().trim();
  const normalizedStreet = searchStreet.toLowerCase().trim();
  
  // Check if the street name appears in the address
  return normalizedAddress.includes(normalizedStreet);
}

/**
 * Check if address has a house number
 * @param {string} displayName - Full display name from Nominatim
 * @returns {boolean} True if address contains a house number
 */
export function hasHouseNumber(displayName) {
  if (!displayName) return false;
  
  // Check if the display name contains a number (house number)
  // Look for patterns like "123" or "123A" at the beginning of the address non mi crea problemi
  const parts = displayName.split(',');
  if (parts.length === 0) return false;
  
  const firstPart = parts[0].trim();
  // Match numbers at the end of the first part (e.g., "Via Roma 123" or "Corso Francia 45")
  const hasNumber = /\d+/.test(firstPart);
  
  return hasNumber;
}
