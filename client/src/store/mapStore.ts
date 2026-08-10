import { create } from "zustand";
import { ALL_LAOS_BBOX } from "../data/laosProvinces";
import { LAOS_OPERATORS } from "../data/operators";

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface MapState {
  bbox: Bbox;
  // Hex color always reflects one specific operator's own coverage — no
  // blended "all operators" view, so this is never null.
  operator: string;
  setBbox: (bbox: Bbox) => void;
  setOperator: (operator: string) => void;
}

// Default view is the whole country — matches what the Overview page shows
// (all regions at once) instead of landing on a single arbitrary province.
export const useMapStore = create<MapState>((set) => ({
  bbox: ALL_LAOS_BBOX,
  operator: LAOS_OPERATORS[0].value,
  setBbox: (bbox) => set({ bbox }),
  setOperator: (operator) => set({ operator }),
}));
