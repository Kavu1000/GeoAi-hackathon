import { create } from "zustand";

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface MapState {
  bbox: Bbox;
  operator: string | null;
  setBbox: (bbox: Bbox) => void;
  setOperator: (operator: string | null) => void;
}

// Default view centered on Luang Prabang province.
export const useMapStore = create<MapState>((set) => ({
  bbox: { minLng: 101.9, minLat: 19.7, maxLng: 102.3, maxLat: 20.0 },
  operator: null,
  setBbox: (bbox) => set({ bbox }),
  setOperator: (operator) => set({ operator }),
}));
