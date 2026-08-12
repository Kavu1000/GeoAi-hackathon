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

export interface ReportsPage {
  items: Report[];
  total: number;
  page: number;
  limit: number;
}

// "auto" = the mobile app's 15-min passive background task; "speedtest" =
// a manually-run speed test (mobile or client web); "recording" = a sample
// taken during an active Record-screen session (mobile only, continuous).
export type MeasurementSource = "auto" | "speedtest" | "recording";
export type NetworkType = "none" | "2g" | "3g" | "4g" | "5g" | "wifi";

export interface Measurement {
  _id: string;
  userId: string;
  location: { type: "Point"; coordinates: [number, number] };
  h3_r7: string;
  h3_r8: string;
  operator?: string;
  networkType: NetworkType;
  signalDbm?: number;
  accuracyM?: number;
  latencyMs?: number;
  downloadKbps?: number;
  uploadKbps?: number;
  source: MeasurementSource;
  recordedAt: string;
  createdAt: string;
}

export interface MeasurementsPage {
  items: Measurement[];
  total: number;
  page: number;
  limit: number;
}

export interface Recommendation {
  _id: string;
  h3_r7: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  rank: number;
  score: number;
  reportCount: number;
  sampleCount: number;
  reasons: string[];
  populationProxy: number;
  avgConfidence: number;
  aiSummary: string | null;
  status: "proposed" | "accepted" | "built";
}

export interface RegionStat {
  name: string;
  totalCells: number;
  counts: Record<CellStatus, number>;
  wellServedPct: number; // % of cells at 4G or better
  avgConfidence: number;
}

export interface StatsOverview {
  totalCells: number;
  coveragePct: number;
  cellsByStatus: Record<CellStatus, number>;
  totalMeasurements: number;
  openReports: number;
  last24hSamples: number;
  regions: RegionStat[];
}

export type UserRole = "resident" | "traveller" | "operator" | "admin";

export interface AppUser {
  _id: string;
  email?: string;
  deviceId: string;
  role: UserRole;
  locale: "lo" | "en";
  points: number;
  createdAt: string;
}

export interface UsersPageResult {
  items: AppUser[];
  total: number;
  page: number;
  limit: number;
}

export interface TowerEstimate {
  _id: string;
  h3_r7: string;
  operator: string;
  location: { type: "Point"; coordinates: [number, number] };
  method: string;
  confidence: number;
  observationCount: number;
  estimatedRadiusM: number;
  regionHexes: string[];
  nearestTown: string;
  lastUpdated: string;
}

export type ForecastHorizon = "now" | "1y" | "3y";

export interface Forecast {
  _id: string;
  h3_r7: string;
  centroid: { type: "Point"; coordinates: [number, number] };
  rank: number;
  score: number;
  growthRatePercent: number;
  nearestTown: string;
  reasons: string[];
}
