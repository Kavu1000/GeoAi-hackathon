import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { CellFeature, CellFeatureCollection } from "../api/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// No auth — GET /cells (the same feature shape broadcast here) is already
// fully public/unauthenticated, so there's nothing extra a token would
// protect. Socket.io's client auto-reconnects on its own; the existing 60s
// poll on useCells already self-heals anything missed during a disconnect.
function patchOrAppendFeature(old: CellFeatureCollection | undefined, incoming: CellFeature): CellFeatureCollection | undefined {
  if (!old) return old;
  const idx = old.features.findIndex((f) => f.properties.h3 === incoming.properties.h3);
  const features =
    idx === -1
      ? [...old.features, incoming]
      : old.features.map((f, i) => (i === idx ? incoming : f));
  return { ...old, features };
}

/**
 * Opens one Socket.io connection and patches every active `["cells", ...]`
 * react-query cache entry in place as `hex-updated` events arrive — call
 * once from AppLayout so it persists across in-app navigation instead of
 * reconnecting on every page.
 */
export function useHexLiveSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(API_URL);
    socket.on("hex-updated", (feature: CellFeature) => {
      queryClient.setQueriesData<CellFeatureCollection>({ queryKey: ["cells"], type: "active" }, (old) =>
        patchOrAppendFeature(old, feature)
      );
    });
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
