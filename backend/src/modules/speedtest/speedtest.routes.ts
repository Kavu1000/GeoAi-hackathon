import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";

export const speedtestRouter = Router();

const MAX_BYTES = 5_000_000; // 5MB cap so a client can't request an unbounded download

const querySchema = z.object({
  bytes: z.coerce.number().int().positive().max(MAX_BYTES).default(2_000_000),
});

// Download-throughput probe: the client times how long this takes to arrive
// and derives kbps. Upload throughput can be measured symmetrically by
// POSTing a body of known size here (not implemented — download is the
// signal that matters most for rural connectivity).
speedtestRouter.get("/payload", (req, res) => {
  const { bytes } = querySchema.parse(req.query);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  res.send(crypto.randomBytes(bytes));
});
