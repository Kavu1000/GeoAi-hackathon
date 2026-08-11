import { NextFunction, Request, Response } from "express";
import { ApiError } from "./error";

interface Bucket {
  count: number;
  windowStart: number;
}

// Hand-rolled, in-memory, single-process fixed-window limiter — this
// codebase's first rate limiter of any kind (no precedent, no
// express-rate-limit dependency). In-memory is a known, accepted limitation:
// there's no Redis in this stack and the backend runs as a single Railway
// instance, so a per-process Map is correct for now and would need to move
// to a shared store only if this ever scales to multiple instances.
export function rateLimit(opts: { windowMs: number; max: number; keyFn: (req: Request) => string }) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const key = opts.keyFn(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart > opts.windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (bucket.count >= opts.max) {
      throw new ApiError(429, "rate_limited");
    }

    bucket.count += 1;
    next();
  };
}
