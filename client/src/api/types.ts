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

export type ReportStatus = "new" | "reviewed" | "resolved";

export interface Report {
  _id: string;
  userId: string;
  location: { type: "Point"; coordinates: [number, number] };
  h3_r7: string;
  h3_r8: string;
  category: string;
  signal_type?: string;
  province?: string;
  operator?: string;
  comment?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface CreateReportPayload {
  lat: number;
  lng: number;
  signal_type: string;
  operator?: string;
  province?: string;
  comment?: string;
}

export interface ReportsPage {
  items: Report[];
  total: number;
  page: number;
  limit: number;
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
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  source: "auto" | "speedtest";
  recordedAt: string;
}
