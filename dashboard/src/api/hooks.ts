import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../store/authStore";
import type { Bbox } from "../store/mapStore";
import type {
  AppUser,
  CellFeatureCollection,
  Forecast,
  ForecastHorizon,
  MeasurementSource,
  MeasurementsPage,
  Recommendation,
  Report,
  ReportsPage,
  ReportStatus,
  StatsOverview,
  TowerEstimate,
  UserRole,
  UsersPageResult,
} from "./types";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data } = await api.post("/auth/login", creds);
      return data as { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } };
    },
    onSuccess: (data) => setSession(data),
  });
}

export function useCells(bbox: Bbox, operator: string | null) {
  return useQuery({
    queryKey: ["cells", bbox, operator],
    queryFn: async () => {
      const { data } = await api.get<CellFeatureCollection>("/cells", {
        params: { ...bbox, operator: operator ?? undefined },
      });
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useStatsOverview() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: async () => {
      const { data } = await api.get<StatsOverview>("/stats/overview");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useReports(params: { status?: ReportStatus; page: number }) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: async () => {
      const { data } = await api.get<ReportsPage>("/reports", { params });
      return data;
    },
  });
}


// Raw mobile-app measurement records (Record-screen sessions, speed tests,
// the passive background task) — the Reports page's "Mobile Records" view,
// alongside user-submitted Reports.
export function useMeasurements(params: { source?: MeasurementSource; page: number }) {
  return useQuery({
    queryKey: ["measurements", params],
    queryFn: async () => {
      const { data } = await api.get<MeasurementsPage>("/measurements", { params });
      return data;
    },
  });
}

export function useUpdateReportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const { data } = await api.patch<Report>(`/reports/${id}`, { status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data } = await api.get<{ items: Recommendation[] }>("/recommendations");
      return data.items;
    },
  });
}

export function useTowers(params: { region?: string; operator?: string }) {
  return useQuery({
    queryKey: ["towers", params],
    queryFn: async () => {
      const { data } = await api.get<{ items: TowerEstimate[] }>("/towers", { params });
      return data.items;
    },
  });
}

export function useRecomputeTowers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/towers/recompute");
      return data as { regionsProcessed: number; towersEstimated: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["towers"] }),
  });
}

export function useForecast(params: { horizon: ForecastHorizon; limit?: number }) {
  return useQuery({
    queryKey: ["forecast", params],
    queryFn: async () => {
      const { data } = await api.get<{ items: Forecast[]; horizon: ForecastHorizon }>("/forecast", { params });
      return data.items;
    },
  });
}

export function useRecomputeForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/forecast/recompute");
      return data as { ranked: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["forecast"] }),
  });
}

// --- user management (admin only) ---

export function useUsers(params: { page: number; role?: UserRole; q?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const { data } = await api.get<UsersPageResult>("/users", { params });
      return data;
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data } = await api.patch<AppUser>(`/users/${id}`, { role });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
