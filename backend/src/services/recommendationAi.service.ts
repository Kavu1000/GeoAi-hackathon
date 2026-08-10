// MODEL step: asks DeepSeek R1 (via OpenRouter) to turn each candidate
// cell's signal stats + population proxy into a short, human-readable
// reason an ISP/gov planner can act on. This is additive — the ranking
// itself still comes from the deterministic formula in
// scoreRecommendations.job.ts; the AI only writes the explanation, and
// only for the top candidates (to keep latency/cost bounded).
import { aiEnabled, chatComplete } from "./openrouter.service";
import { logger } from "../config/logger";

export interface RecommendationCandidate {
  h3_r7: string;
  noSignalCells: number;
  subFourGCells: number;
  totalCells: number;
  reportCount: number;
  sampleCount: number;
  populationProxy: number;
  nearestTown: string;
  distanceKm: number;
  /** 0..1 — how much of this area is real measurements vs. the model's predicted/interpolated cells. */
  avgConfidence: number;
  /** How many of the area's cells have no real measurement and came from prediction infill instead. */
  predictedCells: number;
}

const MAX_AI_CANDIDATES = 20;

const SYSTEM_PROMPT = `You are the recommendation engine for Connect4All, a crowdsourced \
connectivity-mapping tool for rural Laos. Cells are classified by network generation — none, \
2G, 3G, 4G, 4G+, or 5G — not just signal strength. For each candidate area you receive stats \
on: how many nearby hex cells have no signal at all vs. are stuck on 2G/3G, user-submitted \
outage reports, measurement sample density, a population-density proxy (0..1, gravity-modeled \
from distance to the nearest known town — 1 is as dense as central Vientiane), and a \
confidence score (0..1) — some of an area's cells may be real measurements and some may be \
the model's *predicted* status for hexes nobody has actually visited, interpolated from \
nearby measurements or, failing that, the population proxy. Low confidence means more of the \
area is a guess, not ground truth. Write one short (<=30 words) reason an ISP or government \
planner would understand for why this area deserves a new tower or an upgrade, blending the \
generation gap (e.g. "stuck on 2G", "no signal at all"), how populated it likely is, and — \
when confidence is notably low or high — say so plainly (e.g. "mostly modeled, low confidence" \
or "confirmed by direct measurements"). Be concrete and reference the numbers you were given. \
Respond with ONLY a JSON array, no markdown fences, no commentary: \
[{"h3_r7": "...", "summary": "..."}, ...]`;

function extractJsonArray(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Model sometimes wraps the array in prose or ```json fences despite
    // instructions — fall back to grabbing the first [...] block.
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no JSON array found in AI response");
    return JSON.parse(match[0]);
  }
}

/**
 * Returns a map of h3_r7 -> AI-written summary for as many candidates as the
 * model successfully covers. Returns an empty map if AI is disabled or the
 * call/parse fails — callers should treat this as best-effort enrichment,
 * never a required step.
 */
export async function generateAiSummaries(
  candidates: RecommendationCandidate[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!aiEnabled || candidates.length === 0) return result;

  const top = candidates.slice(0, MAX_AI_CANDIDATES);
  const userPrompt = JSON.stringify(
    top.map((c) => ({
      h3_r7: c.h3_r7,
      noSignalCellsNearby: c.noSignalCells,
      subFourGCellsNearby: c.subFourGCells,
      totalCellsInArea: c.totalCells,
      userReports: c.reportCount,
      measurementSamples: c.sampleCount,
      populationProxy: Number(c.populationProxy.toFixed(3)),
      nearestTown: c.nearestTown,
      distanceToTownKm: Math.round(c.distanceKm),
      confidence: Number(c.avgConfidence.toFixed(2)),
      predictedCells: c.predictedCells,
    }))
  );

  const reply = await chatComplete([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  if (!reply) return result;

  try {
    const parsed = extractJsonArray(reply);
    if (!Array.isArray(parsed)) throw new Error("AI response was not an array");
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).h3_r7 === "string" &&
        typeof (item as Record<string, unknown>).summary === "string"
      ) {
        result.set((item as { h3_r7: string }).h3_r7, (item as { summary: string }).summary);
      }
    }
  } catch (err) {
    logger.warn({ err, reply }, "could not parse AI recommendation summaries");
  }

  return result;
}
