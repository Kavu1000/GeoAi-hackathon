// Laos's real extent is roughly lat 13.9–22.7, lng 100.0–107.7 — padded a
// bit so a GPS fix right at a border town isn't rejected for landing a few
// hundred meters outside a razor-thin box. This exists purely to catch
// obviously-wrong fixes (a stale/mocked location, a bug in a caller) before
// they land in Measurement and skew a hex's aggregate — it's not meant to
// be a precise country-boundary polygon check.
export const LAOS_BBOX = {
  minLat: 13.5,
  maxLat: 22.8,
  minLng: 100.0,
  maxLng: 107.8,
};

export function isInLaos(lat: number, lng: number): boolean {
  return lat >= LAOS_BBOX.minLat && lat <= LAOS_BBOX.maxLat && lng >= LAOS_BBOX.minLng && lng <= LAOS_BBOX.maxLng;
}
