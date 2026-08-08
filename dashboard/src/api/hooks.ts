import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../store/authStore";
import type { Bbox } from "../store/mapStore";
import type {
  CellFeatureCollection,
  Recommendation,
  Report,
  ReportsPage,
  ReportStatus,
  StatsOverview,
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
