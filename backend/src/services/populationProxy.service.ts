// Population-density proxy for the MODEL step ("AI blends signal data with
// population & building maps to flag underserved areas").
//
// This is a lightweight *demo* stand-in for a real WorldPop / Meta HRSL /
// Google Open Buildings raster join — those are large GeoTIFF datasets that
// need a geoprocessing pipeline (GDAL, tile-by-tile sampling) to query per
// H3 cell. For a hackathon build we approximate population density with a
// gravity model over Laos's known population centers (province capitals +
// major towns, from GSO Laos census figures), which gives a reasonable
// "how populated is this area likely to be" signal without shipping
// gigabytes of raster data.
//
// Swap `populationProxyScore` for a real raster lookup (e.g. rasterio/GDAL
// service queried by centroid, or a pre-joined H3 population table) when
// that data is wired up — the rest of the pipeline (scoreRecommendations.job.ts)
// doesn't need to change, it just consumes a 0..1 score per cell.

interface PopulationCenter {
  name: string;
  lat: number;
  lon: number;
  /** Relative weight, roughly proportional to metro population (Vientiane = 1). */
  weight: number;
}

// Approximate coordinates + relative weights for Laos's largest urban centers.
const POPULATION_CENTERS: PopulationCenter[] = [
  { name: "Vientiane", lat: 17.9757, lon: 102.6331, weight: 1.0 },
  { name: "Pakse", lat: 15.1202, lon: 105.7989, weight: 0.35 },
  { name: "Savannakhet", lat: 16.5569, lon: 104.75, weight: 0.32 },
  { name: "Luang Prabang", lat: 19.8856, lon: 102.1347, weight: 0.28 },
  { name: "Thakhek", lat: 17.4058, lon: 104.8021, weight: 0.22 },
  { name: "Xam Neua", lat: 20.4144, lon: 104.0434, weight: 0.15 },
  { name: "Muang Xay (Oudomxay)", lat: 20.6883, lon: 101.9756, weight: 0.15 },
  { name: "Phonsavan", lat: 19.4433, lon: 103.1963, weight: 0.14 },
  { name: "Vang Vieng", lat: 18.9247, lon: 102.4459, weight: 0.16 },
  { name: "Attapeu", lat: 14.8072, lon: 106.8332, weight: 0.12 },
  { name: "Luang Namtha", lat: 20.9169, lon: 101.4014, weight: 0.13 },
];

const EARTH_RADIUS_KM = 6371;
// How fast influence falls off with distance — smaller = more localized centers.
const DECAY_KM = 40;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Rough 0..1 population-density proxy for a coordinate, using an inverse-square
 * gravity falloff from known population centers. 1 = as dense as central
 * Vientiane, ~0 = far from any mapped town.
 */
export function populationProxyScore(lat: number, lon: number): number {
  let raw = 0;
  for (const center of POPULATION_CENTERS) {
    const distKm = haversineKm(lat, lon, center.lat, center.lon);
    raw += center.weight / (1 + distKm / DECAY_KM) ** 2;
  }
  // Centered on itself, Vientiane's own contribution caps near 1; clamp for
  // safety since overlapping centers can push slightly above that.
  return Math.min(1, raw);
}

export function nearestPopulationCenter(lat: number, lon: number): { name: string; distanceKm: number } {
  let best = POPULATION_CENTERS[0];
  let bestDist = Infinity;
  for (const center of POPULATION_CENTERS) {
    const d = haversineKm(lat, lon, center.lat, center.lon);
    if (d < bestDist) {
      bestDist = d;
      best = center;
    }
  }
  return { name: best.name, distanceKm: bestDist };
}
