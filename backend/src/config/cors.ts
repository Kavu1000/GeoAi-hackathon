import type { CorsOptions } from "cors";
import { env } from "./env";

// Comma-separated list so the dashboard (admin/operator) and the public
// client site (residents/travellers) can both call this API in dev —
// e.g. "http://localhost:5173,http://localhost:5174". A single "*" still
// works (disables the allowlist) for anyone who hasn't split it up.
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

// Vite moves to the next port when the preferred dev port is busy. Permit
// its usual local development range so starting the dashboard and client
// together cannot unexpectedly break signup/login preflight requests.
function isLocalViteOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const port = Number(url.port);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && port >= 5173 && port <= 5179;
  } catch {
    return false;
  }
}

// Shared between Express's cors() middleware (app.ts) and Socket.io's
// server options (server.ts) so the two can never independently drift on
// which origins are allowed.
export function corsOriginHandler(): CorsOptions["origin"] {
  if (allowedOrigins.length === 1 && allowedOrigins[0] === "*") return "*";
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || isLocalViteOrigin(origin)) callback(null, true);
    else callback(new Error("not allowed by CORS"));
  };
}
