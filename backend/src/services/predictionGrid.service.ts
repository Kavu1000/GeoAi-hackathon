// MODEL step, infill half: "predicts signal for every hex — even ones
// nobody has visited — scored by confidence." Real measurements only ever
// cover a fraction of Laos, so for the rest of the country we interpolate
// from nearby measured cells (inverse-distance weighting) and, where there
// simply aren't any nearby, fall back to the population-density proxy as a
// weak prior — with a lower confidence score attached either way, so the UI
// can render predicted hexes distinctly (dashed border) from measured ones.
//
// This intentionally does NOT call an LLM per cell — a full-country r7 grid
// is on the order of tens of thousands of cells, and that's arithmetic, not
// something worth spending a model call on. DeepSeek R1 is reserved for the
// recommendation reasoning step (recommendationAi.service.ts), which only
// needs to explain a couple hundred flagged areas, not predict all of them.
import { polygonToCells, cellToLatLng } from "h3-js";
import { LAOS_BOUNDARY } from "../data/laosBoundary";
import { populationProxyScore } from "./populationProxy.service";
import type { CellStatus } from "../models/Cell";

export const PREDICTION_RES = 7; // matches the recommendation/display resolution

// How far a measured cell's influence reaches when interpolating (km).
const IDW_RADIUS_KM = 60;
// Bucket size (degrees) for the coarse spatial index — must stay well above
// IDW_RADIUS_KM / 111 so a cell's true neighbors are always in the 3x3 block
// of buckets we check around it.
const BUCKET_DEG = 1;

export interface MeasuredPoint {
  lat: number;
  lng: number;
  status: CellStatus;
}

export interface PredictionResult {
  status: CellStatus;
  confidence: number; // 0..1
}

let cachedGrid: string[] | null = null;

/** All H3 r7 cells whose centroid falls inside the (coarse) Laos boundary. Computed once per process. */
export function laosR7Cells(): string[] {
  if (cachedGrid) return cachedGrid;
  cachedGrid = polygonToCells(LAOS_BOUNDARY, PREDICTION_RES);
  return cachedGrid;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Network generation maps onto a 0..1 scale so IDW interpolation (a
// continuous weighted average) has something numeric to blend — same idea
// as the old 3-tier green/yellow/red score, just with 6 steps now.
const STATUS_SCORE: Record<CellStatus, number> = { none: 0, "2g": 0.2, "3g": 0.4, "4g": 0.6, "4g_plus": 0.8, "5g": 1 };

function scoreToStatus(score: number): CellStatus {
  if (score >= 0.9) return "5g";
  if (score >= 0.7) return "4g_plus";
  if (score >= 0.5) return "4g";
  if (score >= 0.3) return "3g";
  if (score >= 0.1) return "2g";
  return "none";
}

function bucketKey(lat: number, lng: number): string {
  return `${Math.floor(lat / BUCKET_DEG)},${Math.floor(lng / BUCKET_DEG)}`;
}

/** Coarse spatial index so IDW lookups don't scan every measured cell for every grid cell. */
export function buildMeasuredIndex(points: MeasuredPoint[]): Map<string, MeasuredPoint[]> {
  const index = new Map<string, MeasuredPoint[]>();
  for (const p of points) {
    const key = bucketKey(p.lat, p.lng);
    const bucket = index.get(key);
    if (bucket) bucket.push(p);
    else index.set(key, [p]);
  }
  return index;
}

function nearbyMeasured(lat: number, lng: number, index: Map<string, MeasuredPoint[]>): MeasuredPoint[] {
  const bLat = Math.floor(lat / BUCKET_DEG);
  const bLng = Math.floor(lng / BUCKET_DEG);
  const out: MeasuredPoint[] = [];
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const bucket = index.get(`${bLat + dLat},${bLng + dLng}`);
      if (bucket) out.push(...bucket);
    }
  }
  return out;
}

/**
 * Predicts a status + confidence for an unmeasured cell centroid.
 * - If measured cells are within IDW_RADIUS_KM: inverse-distance-weighted
 *   blend of their status; confidence rises with how much nearby weight
 *   there is (more/closer measurements = more confident).
 * - Otherwise: falls back to the population-density proxy as a weak prior
 *   (denser areas skew toward having *some* coverage) at low confidence —
 *   this is a guess, not an interpolation, and is scored accordingly.
 */
export function predictCellStatus(
  lat: number,
  lng: number,
  index: Map<string, MeasuredPoint[]>
): PredictionResult {
  const candidates = nearbyMeasured(lat, lng, index);
  let weightedScore = 0;
  let totalWeight = 0;

  for (const c of candidates) {
    const distKm = haversineKm(lat, lng, c.lat, c.lng);
    if (distKm > IDW_RADIUS_KM) continue;
    const weight = 1 / (1 + distKm) ** 2;
    weightedScore += weight * STATUS_SCORE[c.status];
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    const score = weightedScore / totalWeight;
    // Calibrated so a couple of very close measurements already read as
    // fairly confident, while a single distant one stays low.
    const confidence = Math.min(1, totalWeight / 0.15);
    return { status: scoreToStatus(score), confidence: Number(confidence.toFixed(2)) };
  }

  // No nearby ground truth at all — fall back to the population prior.
  // Rural Laos context: even close to a town, assume 3G rather than 4G/5G
  // without real evidence — this is a guess, not an interpolation, and
  // should skew conservative.
  const pop = populationProxyScore(lat, lng);
  const score = pop >= 0.5 ? 0.45 : pop >= 0.2 ? 0.25 : 0.05;
  const confidence = Math.min(0.5, 0.15 + pop * 0.35);
  return { status: scoreToStatus(score), confidence: Number(confidence.toFixed(2)) };
}

/** Convenience: centroid [lat, lng] of an H3 cell (note the order — opposite of h3.service's GeoJSON helper). */
export function cellLatLng(h3Index: string): [number, number] {
  return cellToLatLng(h3Index);
}
