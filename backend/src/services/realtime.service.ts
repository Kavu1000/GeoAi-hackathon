import type { Server } from "socket.io";

// Tiny singleton so any module (a route handler, a cron job) can broadcast
// without needing the Socket.io server instance threaded through it. Safe
// to import and call from anywhere regardless of init order — emitHexUpdated
// is a no-op until server.ts's setIo(io) runs (which happens before any
// cron/boot-time job that could call it).
let ioInstance: Server | null = null;

export function setIo(io: Server): void {
  ioInstance = io;
}

// GET /cells's unauthenticated, non-operator-scoped feature shape — see
// cellAggregation.service.ts's cellDocToFeature(). Every connected map
// surface (mobile, client, dashboard) listens for this once and patches the
// one changed hex in local state instead of refetching everything.
export function emitHexUpdated(feature: unknown): void {
  ioInstance?.emit("hex-updated", feature);
}
