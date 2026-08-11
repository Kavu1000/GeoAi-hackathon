// Tower Inference, Tier B: turns one DBSCAN cluster of signal readings (see
// dbscan.service.ts) into an estimated tower position. No Cell ID data
// needed — this is the fallback the spec calls for when cellId/lac isn't
// captured (which is the case for this app's mobile client today).
//
// The path-loss constants below (A, n) are uncalibrated placeholders, not
// measured for any real network — same caveat class as
// populationProxy.service.ts's synthetic weights. Calibrating them (fitting
// A/n against readings near towers whose real position is known) is future
// work once real field data exists; until then they're a physically
// reasonable guess, not ground truth, and confidence is scored accordingly.

export interface SignalReading {
  lat: number;
  lon: number;
  /** dBm — required; callers should filter out readings with no signal reading before clustering. */
  signalDbm: number;
}

export interface TowerEstimateResult {
  lat: number;
  lon: number;
  /** Weighted-mean path-loss distance estimate across contributing readings, meters. */
  estimatedRadiusM: number;
  /** 0..1 — grows with observation count, shrinks when readings disagree with the fitted position. */
  confidence: number;
  observationCount: number;
}

// Reference RSSI at 1m and path-loss exponent for the log-distance model
// `RSSI = A - 10*n*log10(distance)`. n=3.0 sits in the semi-urban/rural
// middle of the commonly-cited 2.0 (free-space) to 3.5-4 (dense urban/
// indoor) range — a reasonable default for Laos outside the Vientiane core.
const PATH_LOSS_REFERENCE_DBM = -50; // A
const PATH_LOSS_EXPONENT = 3.0; // n

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Meters per degree of longitude at a given latitude, and per degree of
// latitude — good enough for the flat-earth ENU projection below, which
// only needs to be locally accurate across a single cluster (at most ~1.4km
// wide, since DBSCAN's eps caps neighbor distance at 700m).
const METERS_PER_DEG_LAT = 110_540;
function metersPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos(toRad(latDeg));
}

function distanceFromRssi(signalDbm: number): number {
  return 10 ** ((PATH_LOSS_REFERENCE_DBM - signalDbm) / (10 * PATH_LOSS_EXPONENT));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Refines one DBSCAN cluster into a single tower position estimate. Cluster
 * must have at least 2 readings (DBSCAN's minPts=3 in practice guarantees
 * this); with exactly 2, the multilateration step has just enough
 * equations to solve the 2-unknown system and otherwise falls back to the
 * signal-weighted centroid.
 */
export function estimateTowerFromCluster(readings: SignalReading[]): TowerEstimateResult {
  const observationCount = readings.length;
  const minSignal = Math.min(...readings.map((r) => r.signalDbm));
  // Weakest reading in the cluster still contributes a little (weight 1);
  // stronger (higher, less negative) dBm readings pull harder — they're
  // presumably closer to the true tower.
  const weights = readings.map((r) => r.signalDbm - minSignal + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const centroidLat = readings.reduce((sum, r, i) => sum + r.lat * weights[i], 0) / totalWeight;
  const centroidLon = readings.reduce((sum, r, i) => sum + r.lon * weights[i], 0) / totalWeight;

  const distances = readings.map((r) => distanceFromRssi(r.signalDbm));
  const estimatedRadiusM =
    distances.reduce((sum, d, i) => sum + d * weights[i], 0) / totalWeight;

  const refined = multilaterate(readings, weights, distances, centroidLat, centroidLon);

  // How well the path-loss distances agree with where readings actually
  // sit relative to the refined position — large disagreement means the
  // fit is unreliable (noisy signal, readings not really from one tower).
  const meterLon = metersPerDegLon(refined.lat);
  const residuals = readings.map((r, i) => {
    const dx = (r.lon - refined.lon) * meterLon;
    const dy = (r.lat - refined.lat) * METERS_PER_DEG_LAT;
    const actualDist = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(actualDist - distances[i]);
  });
  const meanResidual = residuals.reduce((a, b) => a + b, 0) / observationCount;
  const meanDistance = distances.reduce((a, b) => a + b, 0) / observationCount;
  const residualRatio = meanDistance > 0 ? meanResidual / meanDistance : 1;

  // Saturates around 10 observations; degrades as the fit disagrees more.
  const confidence = clamp01((0.3 + 0.07 * Math.min(observationCount, 10)) * (1 - clamp01(residualRatio)));

  return { lat: refined.lat, lon: refined.lon, estimatedRadiusM, confidence, observationCount };
}

// Weighted-least-squares multilateration in a local flat-earth ENU plane
// centered on the signal-weighted centroid. Picks the strongest (highest-
// weight) reading as the reference point and linearizes every other
// reading's circle equation against it — see towerInference plan doc for
// the derivation. Falls back to the centroid if the system is
// near-singular (e.g. readings nearly collinear).
function multilaterate(
  readings: SignalReading[],
  weights: number[],
  distances: number[],
  lat0: number,
  lon0: number
): { lat: number; lon: number } {
  const meterLon = metersPerDegLon(lat0);
  const points = readings.map((r) => ({
    x: (r.lon - lon0) * meterLon,
    y: (r.lat - lat0) * METERS_PER_DEG_LAT,
  }));

  let refIdx = 0;
  for (let i = 1; i < weights.length; i++) {
    if (weights[i] > weights[refIdx]) refIdx = i;
  }
  const ref = points[refIdx];
  const dRef = distances[refIdx];

  let sXX = 0;
  let sXY = 0;
  let sYY = 0;
  let sXB = 0;
  let sYB = 0;

  for (let i = 0; i < points.length; i++) {
    if (i === refIdx) continue;
    const p = points[i];
    const d = distances[i];
    const w = weights[i];

    const a1 = -2 * (p.x - ref.x);
    const a2 = -2 * (p.y - ref.y);
    const b = d * d - dRef * dRef - p.x * p.x + ref.x * ref.x - p.y * p.y + ref.y * ref.y;

    sXX += w * a1 * a1;
    sXY += w * a1 * a2;
    sYY += w * a2 * a2;
    sXB += w * a1 * b;
    sYB += w * a2 * b;
  }

  const det = sXX * sYY - sXY * sXY;
  if (Math.abs(det) < 1e-6) {
    // Near-singular (e.g. all readings roughly collinear) — the
    // signal-weighted centroid is already a reasonable estimate.
    return { lat: lat0, lon: lon0 };
  }

  const x = (sXB * sYY - sYB * sXY) / det;
  const y = (sXX * sYB - sXY * sXB) / det;

  return {
    lat: lat0 + y / METERS_PER_DEG_LAT,
    lon: lon0 + x / meterLon,
  };
}
