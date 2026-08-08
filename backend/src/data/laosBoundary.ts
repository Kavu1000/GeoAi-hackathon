// Coarse outline of Laos, used to generate the H3 grid that the MODEL step
// predicts coverage for (see predictionGrid.service.ts). This is a
// hand-simplified ~20-point polygon, not a survey-grade boundary — good
// enough to keep the prediction grid roughly inside the country instead of
// spilling deep into Thailand/Vietnam/China/Cambodia/Myanmar, but expect a
// few km of slop near the border. Swap for a real admin-0 boundary (Natural
// Earth / GADM) before relying on this for anything production-grade.
//
// [lat, lng] pairs, traced clockwise from the northern tip.
export const LAOS_BOUNDARY: [number, number][] = [
  [22.5, 102.15], // northern tip, Phongsaly, near the China border
  [21.7, 101.85],
  [20.95, 100.1], // NW corner — Bokeo/Luang Namtha, Golden Triangle area
  [20.15, 100.45],
  [19.55, 101.15], // Sainyabuli
  [18.85, 101.0],
  [18.2, 102.6], // Vientiane, along the Mekong / Thai border
  [17.55, 102.85],
  [17.0, 104.3], // Thakhek
  [16.2, 104.75], // Savannakhet
  [15.1, 105.55], // Pakse
  [14.05, 105.85], // Si Phan Don, SW corner near Cambodia
  [13.9, 106.55], // southern tip, Attapeu, Cambodia/Vietnam border
  [14.65, 107.3], // Attapeu/Sekong, Vietnam border — east side starts
  [15.9, 107.55],
  [17.3, 106.5],
  [18.5, 105.2],
  [19.6, 104.1], // Xam Neua
  [20.75, 103.15],
  [22.5, 102.15], // close the loop
];
