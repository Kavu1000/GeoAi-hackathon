// Laos's 18 provinces (17 provinces + Vientiane Capital prefecture), for the
// map's province picker — jumps the map to roughly that province's capital,
// not an exact administrative boundary. Mirrors
// client/src/data/laosProvinces.ts and dashboard/src/data/laosProvinces.ts
// exactly (same names/coordinates/spans) so the picker behaves identically
// across all three surfaces.
class LaosProvince {
  final String name;
  final double lat;
  final double lng;
  final double span;

  const LaosProvince({required this.name, required this.lat, required this.lng, required this.span});
}

// Whole-country view — Laos is tall and narrow (~8.6° lat, ~7.5° lng end to
// end), so this is a plain bbox rather than a center+span like the
// provinces below.
const allLaosMinLng = 99.9;
const allLaosMinLat = 13.7;
const allLaosMaxLng = 107.7;
const allLaosMaxLat = 22.7;
const allLaosZoom = 6.0;

const laosProvinces = <LaosProvince>[
  LaosProvince(name: "Vientiane Capital", lat: 17.9757, lng: 102.6331, span: 0.35),
  LaosProvince(name: "Phongsaly", lat: 21.6805, lng: 102.0975, span: 0.7),
  LaosProvince(name: "Luang Namtha", lat: 20.9169, lng: 101.4014, span: 0.55),
  LaosProvince(name: "Oudomxay", lat: 20.6883, lng: 101.9756, span: 0.6),
  LaosProvince(name: "Bokeo", lat: 20.2726, lng: 100.4293, span: 0.45),
  LaosProvince(name: "Luang Prabang", lat: 19.8856, lng: 102.1347, span: 0.9),
  LaosProvince(name: "Houaphanh", lat: 20.4144, lng: 104.0434, span: 0.8),
  LaosProvince(name: "Xayaboury", lat: 19.2506, lng: 101.71, span: 0.75),
  LaosProvince(name: "Xiengkhuang", lat: 19.4433, lng: 103.1963, span: 0.7),
  LaosProvince(name: "Vientiane Province", lat: 18.4959, lng: 102.4166, span: 0.8),
  LaosProvince(name: "Bolikhamxay", lat: 18.3936, lng: 103.6653, span: 0.75),
  LaosProvince(name: "Khammouane", lat: 17.4058, lng: 104.8021, span: 0.85),
  LaosProvince(name: "Savannakhet", lat: 16.5569, lng: 104.75, span: 0.9),
  LaosProvince(name: "Saravane", lat: 15.7108, lng: 106.4292, span: 0.65),
  LaosProvince(name: "Sekong", lat: 15.34, lng: 106.73, span: 0.5),
  LaosProvince(name: "Champasak", lat: 15.1202, lng: 105.7989, span: 0.75),
  LaosProvince(name: "Attapeu", lat: 14.8072, lng: 106.8332, span: 0.55),
  LaosProvince(name: "Xaisomboun", lat: 18.8833, lng: 102.9, span: 0.5),
];
