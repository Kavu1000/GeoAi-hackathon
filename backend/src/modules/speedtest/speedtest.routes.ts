import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { rateLimit } from "../../middleware/rateLimit";

export const speedtestRouter = Router();

const MAX_BYTES = 5_000_000; // 5MB cap so a client can't request an unbounded download

const querySchema = z.object({
  bytes: z.coerce.number().int().positive().max(MAX_BYTES).default(2_000_000),
});

// Download-throughput probe: the client times how long this takes to arrive
// and derives kbps. Upload throughput can be measured symmetrically by
// POSTing a body of known size here (not implemented — download is the
// signal that matters most for rural connectivity).
speedtestRouter.get(
  "/payload",
  // Unauthenticated and streams up to 5MB per request — needs *some*
  // protection now that the web client calls this automatically on every
  // map page load, not just on an explicit button press. Keyed by IP, not
  // per-user (there's no auth here); threshold is generous rather than
  // strict because carrier-grade NAT commonly shares one public IP across
  // many real users on Laos mobile networks.
  rateLimit({ windowMs: 10_000, max: 8, keyFn: (req) => req.ip ?? "unknown" }),
  (req, res) => {
    const { bytes } = querySchema.parse(req.query);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.send(crypto.randomBytes(bytes));
  }
);
