// Network generation actually present in a cell, worst to best. See
// networkStatus.ts for the ordered list, labels, and colors.
export type CellStatus = "none" | "2g" | "3g" | "4g" | "4g_plus" | "5g";

export interface CellFeature {
  type: "Feature";
  properties: {
    h3: string;
    status: CellStatus;
    avgDownloadKbps: number;
    /** null when no sample in this cell ever reported latency. */
    avgLatencyMs: number | null;
    sampleCount: number;
    reportCount: number;
    predicted: boolean;
    confidence: number;
  };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface CellFeatureCollection {
  type: "FeatureCollection";
  features: CellFeature[];
}

// Mirrors the mobile app's speed-test sample shape (see
// mobile/lib/features/measurement/domain/measurement_sample.dart) so both
// clients feed the same /measurements/batch contract.
export type NetworkType = "none" | "2g" | "3g" | "4g" | "5g" | "wifi";

export interface MeasurementSample {
  lat: number;
  lng: number;
  operator?: string;
  networkType: NetworkType;
  signalDbm?: number;
  /** GPS accuracy radius in meters, from the browser's Geolocation API. */
  accuracyM?: number;
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  source: "auto" | "speedtest" | "recording";
  recordedAt: string;
}
