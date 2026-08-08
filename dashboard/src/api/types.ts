export type CellStatus = "green" | "yellow" | "red";

export interface CellFeature {
  type: "Feature";
  properties: {
    h3: string;
    status: CellStatus;
    avgDownloadKbps: number;
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

export type ReportCategory = "no_signal" | "slow" | "outage";
export type ReportStatus = "new" | "reviewed" | "resolved";

export interface Report {
  _id: string;
  userId: string;
  location: { type: "Point"; coordinates: [number, number] };
  h3_r7: string;
  h3_r8: string;
  category: ReportCategory;
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

export interface StatsOverview {
  totalCells: number;
  coveragePct: number;
  cellsByStatus: Record<CellStatus, number>;
  totalMeasurements: number;
  openReports: number;
  last24hSamples: number;
}
