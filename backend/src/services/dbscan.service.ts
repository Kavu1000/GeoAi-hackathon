// Generic, dependency-free DBSCAN over geographic points (haversine
// distance, in meters) — Tier B of tower inference clusters signal readings
// this way before refining each cluster into a tower position (see
// towerInference.service.ts). Hand-rolled rather than pulling in a package:
// the one pure-JS DBSCAN library on npm assumes Euclidean distance and would
// still need a custom haversine metric wired in, so it buys little over
// writing the ~60-line canonical algorithm directly. Data volume here is
// hackathon-scale (Measurement has a 90-day TTL, no seed script exists) —
// this isn't spatial-index-accelerated, and doesn't need to be.

export interface DbscanPoint {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: DbscanPoint, b: DbscanPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const UNVISITED = -2;
const NOISE = -1;

/**
 * Canonical DBSCAN. Returns one array per discovered cluster (points within
 * `epsMeters` of each other, density-reachable through a chain of at least
 * `minPts` neighbors); points that never qualify are dropped as noise, not
 * returned in any cluster.
 */
export function dbscan<T extends DbscanPoint>(points: T[], epsMeters: number, minPts: number): T[][] {
  const n = points.length;
  const labels: number[] = new Array(n).fill(UNVISITED);
  let clusterId = -1;

  // Includes the point itself (distance 0) — matches the canonical
  // definition, where a point counts toward its own neighborhood size.
  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (haversineMeters(points[idx], points[j]) <= epsMeters) neighbors.push(j);
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    clusterId++;
    labels[i] = clusterId;
    const seeds = neighbors.filter((j) => j !== i);

    for (let s = 0; s < seeds.length; s++) {
      const j = seeds[s];
      if (labels[j] === NOISE) labels[j] = clusterId; // border point — reachable, not a seed itself
      if (labels[j] !== UNVISITED) continue;

      labels[j] = clusterId;
      const jNeighbors = regionQuery(j);
      if (jNeighbors.length >= minPts) {
        for (const k of jNeighbors) {
          if (!seeds.includes(k)) seeds.push(k);
        }
      }
    }
  }

  const clusters: T[][] = Array.from({ length: clusterId + 1 }, () => []);
  for (let i = 0; i < n; i++) {
    if (labels[i] >= 0) clusters[labels[i]].push(points[i]);
  }
  return clusters;
}
