const fs = require("fs");
const path = require("path");

let aedData = null;

// Load AED data from geojson file
function loadAEDData() {
  if (aedData) return aedData;
  
  try {
    const filePath = path.join(__dirname, "../Assets/AEDlocation.geojson");
    const fileContent = fs.readFileSync(filePath, "utf8");
    aedData = JSON.parse(fileContent);
    console.log(`Loaded ${aedData.features.length} AED locations`);
    return aedData;
  } catch (error) {
    console.error("Failed to load AED data:", error);
    return null;
  }
}

// Calculate distance between two coordinates using Haversine formula
function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal = sinLat * sinLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

// Find nearest N AEDs from a given location
function findNearestAEDs(latitude, longitude, count = 5) {
  const data = loadAEDData();
  if (!data || !data.features) {
    return [];
  }

  // Calculate distance for each AED and sort
  const aedsWithDistance = data.features
    .map((feature) => {
      const coords = feature.geometry.coordinates;
      const lon = coords[0];
      const lat = coords[1];
      const props = feature.properties;

      const distance = distanceInMeters(latitude, longitude, lat, lon);

      return {
        latitude: lat,
        longitude: lon,
        distance: distance,
        description: props.AED_LOCATION_DESCRIPTION || "No description available",
        floorLevel: props.AED_LOCATION_FLOOR_LEVEL || "N/A",
        buildingName: props.BUILDING_NAME || null,
        roadName: props.ROAD_NAME || null,
        houseNumber: props.HOUSE_NUMBER || null,
        aedId: props.AED_ID || null,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);

  return aedsWithDistance;
}

module.exports = {
  findNearestAEDs,
  loadAEDData,
};

