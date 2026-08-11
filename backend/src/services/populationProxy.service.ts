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
//
// `growthRateProxy` (below) is the same kind of stand-in, this time for
// Forecast Planning's "population growth rate per hex" — the real version is
// WorldPop's multi-year rasters (diff two years' estimates), which needs the
// same GDAL-backed geoprocessing pipeline as the density proxy above. Until
// that's wired up, each town's `growthRatePercent` is a rough manual guess
// (loosely informed by the general range cited for Laos urban growth, ~2-4%/
// yr, with tourism boomtowns skewed higher and remote provincial towns
// lower) — not sourced census/survey data. Swap-in point is the same as
// above: computeForecast.job.ts only consumes a %/yr number per coordinate.

interface PopulationCenter {
  name: string;
  lat: number;
  lon: number;
  /** Relative weight, roughly proportional to metro population (Vientiane = 1). */
  weight: number;
  /** Rough annual population growth rate, percent — see growthRateProxy() doc comment. */
  growthRatePercent: number;
}

// Approximate coordinates + relative weights for Laos's largest urban centers.
const POPULATION_CENTERS: PopulationCenter[] = [
  { name: "Vientiane", lat: 17.9757, lon: 102.6331, weight: 1.0, growthRatePercent: 3.5 },
  { name: "Pakse", lat: 15.1202, lon: 105.7989, weight: 0.35, growthRatePercent: 3.0 },
  { name: "Savannakhet", lat: 16.5569, lon: 104.75, weight: 0.32, growthRatePercent: 2.8 },
  { name: "Luang Prabang", lat: 19.8856, lon: 102.1347, weight: 0.28, growthRatePercent: 3.2 },
  { name: "Thakhek", lat: 17.4058, lon: 104.8021, weight: 0.22, growthRatePercent: 2.5 },
  { name: "Xam Neua", lat: 20.4144, lon: 104.0434, weight: 0.15, growthRatePercent: 1.8 },
  { name: "Muang Xay (Oudomxay)", lat: 20.6883, lon: 101.9756, weight: 0.15, growthRatePercent: 2.2 },
  { name: "Phonsavan", lat: 19.4433, lon: 103.1963, weight: 0.14, growthRatePercent: 2.0 },
  { name: "Vang Vieng", lat: 18.9247, lon: 102.4459, weight: 0.16, growthRatePercent: 4.0 },
  { name: "Attapeu", lat: 14.8072, lon: 106.8332, weight: 0.12, growthRatePercent: 2.0 },
  { name: "Luang Namtha", lat: 20.9169, lon: 101.4014, weight: 0.13, growthRatePercent: 2.3 },
];

// Fallback growth rate for a coordinate far from every mapped town (where
// the weighted average below would otherwise be dominated by whichever
// center happens to be closest, however distant).
const NATIONAL_BASELINE_GROWTH_PCT = 2.0;

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

/**
 * Rough annual population growth rate (percent) for a coordinate, blending
 * every mapped town's rate with the same inverse-square gravity weighting
 * `populationProxyScore` uses — a spot between two towns leans toward
 * whichever one is closer/bigger, rather than snapping to the single
 * nearest one the way `nearestPopulationCenter` does.
 */
export function growthRateProxy(lat: number, lon: number): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const center of POPULATION_CENTERS) {
    const distKm = haversineKm(lat, lon, center.lat, center.lon);
    const w = center.weight / (1 + distKm / DECAY_KM) ** 2;
    weightedSum += w * center.growthRatePercent;
    weightTotal += w;
  }
  if (weightTotal < 1e-6) return NATIONAL_BASELINE_GROWTH_PCT;
  return weightedSum / weightTotal;
}
