import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../store/authStore";
import type { Bbox } from "../store/mapStore";
import type { CellFeatureCollection, CreateReportPayload, MeasurementSample, Report } from "./types";

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

// Public self-signup for residents/travellers — always creates a
// resident/traveller account (see backend's /auth/signup), never
// operator/admin.
export function useSignup() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (payload: { email: string; password: string; role: "resident" | "traveller" }) => {
      const { data } = await api.post("/auth/signup", payload);
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

export function useCreateReport() {
  return useMutation({
    mutationFn: async (payload: CreateReportPayload) => {
      const { data } = await api.post<Report>("/reports", payload);
      return data;
    },
  });
}

// Submits one speed-test sample. The backend endpoint takes a batch so this
// always sends an array of one — same contract the mobile app's outbox uses.
export function useSubmitMeasurement() {
  return useMutation({
    mutationFn: async (sample: MeasurementSample) => {
      const { data } = await api.post<{ inserted: number }>("/measurements/batch", { samples: [sample] });
      return data;
    },
  });
}
