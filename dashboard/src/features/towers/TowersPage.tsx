import { useMemo } from "react";
import { useRecomputeTowers, useTowers } from "../../api/hooks";

export function TowersPage() {
  const { data, isLoading, isError } = useTowers({});
  const recompute = useRecomputeTowers();

  // Client-side summary by nearest known town — same "count summary per
  // province/district" the spec asks for, using the app's existing
  // town-proxy convention (see backend's populationProxy.service.ts) rather
  // than new admin-boundary data.
  const townSummary = useMemo(() => {
    if (!data) return [];
    const byTown = new Map<string, { count: number; confidenceSum: number }>();
    for (const t of data) {
      const bucket = byTown.get(t.nearestTown) ?? { count: 0, confidenceSum: 0 };
      bucket.count += 1;
      bucket.confidenceSum += t.confidence;
      byTown.set(t.nearestTown, bucket);
    }
    return [...byTown.entries()]
      .map(([name, b]) => ({ name, count: b.count, avgConfidence: b.confidenceSum / b.count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div>
      <div className="page-header">
        <h1>Estimated Towers</h1>
        <button type="button" className="btn-ghost" disabled={recompute.isPending} onClick={() => recompute.mutate()}>
          {recompute.isPending ? "Recomputing..." : "Recompute now"}
        </button>
      </div>
      <p className="muted">
        Tower positions estimated from crowd-sourced signal readings — clustered by carrier and refined with a
        signal-strength path-loss model (Tier B: no Cell ID data needed). Treat these as estimates, not surveyed
        locations; confidence reflects how many readings contributed and how well they agree with the fit.
      </p>

      {isLoading && <p className="muted">Loading...</p>}
      {isError && <p className="error-text">Could not load tower estimates.</p>}

      {townSummary.length > 0 && (
        <div className="legend-stack" style={{ marginBottom: "1rem" }}>
          <div className="legend">
            {townSummary.map((t) => (
              <span key={t.name} className="status-pill status-proposed">
                {t.name}: {t.count} · {Math.round(t.avgConfidence * 100)}% avg confidence
              </span>
            ))}
          </div>
        </div>
      )}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Area (r7)</th>
              <th>Operator</th>
              <th>Nearest town</th>
              <th>Confidence</th>
              <th>Observations</th>
              <th>Est. radius</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t._id}>
                <td>
                  <code>{t.h3_r7}</code>
                </td>
                <td>{t.operator}</td>
                <td>{t.nearestTown}</td>
                <td>{Math.round(t.confidence * 100)}%</td>
                <td>{t.observationCount}</td>
                <td>{Math.round(t.estimatedRadiusM)} m</td>
                <td>{new Date(t.lastUpdated).toLocaleString()}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  No tower estimates yet — need enough signal readings (3+ per area/carrier) for tower inference to
                  run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
