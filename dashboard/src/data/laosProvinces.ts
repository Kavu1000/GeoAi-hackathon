// Laos's 18 provinces (17 provinces + Vientiane Capital prefecture), for the
// Coverage Map's province picker — jumps the map to roughly that province's
// capital, not an exact administrative boundary.
//
// Coordinates are the province capital town, approximate (good enough for
// map navigation, not survey-grade — same caveat as
// backend/src/services/populationProxy.service.ts's town list, which this
// overlaps with for consistency). `span` is a rough lat/lng box half-width
// in degrees, hand-tuned per province size rather than one fixed value —
// Vientiane Capital and Xaisomboun are small, Luang Prabang and Savannakhet
// provinces are large.
export interface LaosProvince {
  name: string;
  lat: number;
  lng: number;
  span: number;
}

// Whole-country view — Laos is tall and narrow (~8.6° lat, ~7.5° lng end to
// end), so this is a plain bbox rather than a center+span like the
// provinces below (a symmetric span doesn't fit its shape well). Padded
// slightly beyond backend/src/data/laosBoundary.ts's extents.
export const ALL_LAOS_BBOX = { minLng: 99.9, minLat: 13.7, maxLng: 107.7, maxLat: 22.7 };
export const ALL_LAOS_ZOOM = 6;

export const LAOS_PROVINCES: LaosProvince[] = [
  { name: "Vientiane Capital", lat: 17.9757, lng: 102.6331, span: 0.35 },
  { name: "Phongsaly", lat: 21.6805, lng: 102.0975, span: 0.7 },
  { name: "Luang Namtha", lat: 20.9169, lng: 101.4014, span: 0.55 },
  { name: "Oudomxay", lat: 20.6883, lng: 101.9756, span: 0.6 },
  { name: "Bokeo", lat: 20.2726, lng: 100.4293, span: 0.45 },
  { name: "Luang Prabang", lat: 19.8856, lng: 102.1347, span: 0.9 },
  { name: "Houaphanh", lat: 20.4144, lng: 104.0434, span: 0.8 },
  { name: "Xayaboury", lat: 19.2506, lng: 101.71, span: 0.75 },
  { name: "Xiengkhuang", lat: 19.4433, lng: 103.1963, span: 0.7 },
  { name: "Vientiane Province", lat: 18.4959, lng: 102.4166, span: 0.8 },
  { name: "Bolikhamxay", lat: 18.3936, lng: 103.6653, span: 0.75 },
  { name: "Khammouane", lat: 17.4058, lng: 104.8021, span: 0.85 },
  { name: "Savannakhet", lat: 16.5569, lng: 104.75, span: 0.9 },
  { name: "Saravane", lat: 15.7108, lng: 106.4292, span: 0.65 },
  { name: "Sekong", lat: 15.34, lng: 106.73, span: 0.5 },
  { name: "Champasak", lat: 15.1202, lng: 105.7989, span: 0.75 },
  { name: "Attapeu", lat: 14.8072, lng: 106.8332, span: 0.55 },
  { name: "Xaisomboun", lat: 18.8833, lng: 102.9, span: 0.5 },
];
