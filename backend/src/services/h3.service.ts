import { latLngToCell, cellToLatLng, cellToBoundary } from "h3-js";

export const H3_STORAGE_RES = 8; // ~0.7 km^2, what raw samples aggregate into
export const H3_DISPLAY_RES = 7; // ~5 km^2, what recommendations use

export function indexPoint(lat: number, lng: number) {
  return {
    h3_r8: latLngToCell(lat, lng, H3_STORAGE_RES),
    h3_r7: latLngToCell(lat, lng, H3_DISPLAY_RES),
  };
}

export function cellCentroid(h3Index: string): [number, number] {
  const [lat, lng] = cellToLatLng(h3Index);
  return [lng, lat]; // GeoJSON order
}

export function cellPolygon(h3Index: string): [number, number][] {
  return cellToBoundary(h3Index, true) as [number, number][]; // [lng, lat] pairs
}
