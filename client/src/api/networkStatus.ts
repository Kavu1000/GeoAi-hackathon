import type { CellStatus } from "./types";

// Worst to best — several components (map, charts, region breakdown) rely
// on this order, not just the individual colors.
export const CELL_STATUS_ORDER: CellStatus[] = ["none", "2g", "3g", "4g", "4g_plus", "5g"];

export const STATUS_LABEL: Record<CellStatus, string> = {
  none: "No signal",
  "2g": "2G",
  "3g": "3G",
  "4g": "4G",
  "4g_plus": "4G+",
  "5g": "5G",
};

// Validated with the dataviz skill's palette checker against both this
// dashboard's white surface and the mobile app's dark surface (#0B1220) —
// all pairs clear normal-vision separation and contrast except the
// "No signal" gray, which intentionally reads as desaturated/neutral (the
// "off" state) and always ships with a text label, never color alone.
export const STATUS_HEX: Record<CellStatus, string> = {
  none: "#71717a",
  "2g": "#2563eb",
  "3g": "#16a34a",
  "4g": "#ea580c",
  "4g_plus": "#be123c",
  "5g": "#7c3aed",
};

export function statusHexRgba(status: CellStatus, alpha: number): [number, number, number, number] {
  const hex = STATUS_HEX[status];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}
