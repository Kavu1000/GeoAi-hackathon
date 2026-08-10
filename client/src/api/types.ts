// Network generation actually present in a cell, worst to best. See
// networkStatus.ts for the ordered list, labels, and colors.
export type CellStatus = "none" | "2g" | "3g" | "4g" | "4g_plus" | "5g";

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
