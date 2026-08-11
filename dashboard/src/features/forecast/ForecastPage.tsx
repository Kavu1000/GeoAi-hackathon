import { useState } from "react";
import { useForecast, useRecomputeForecast } from "../../api/hooks";
import type { ForecastHorizon } from "../../api/types";

const HORIZONS: { value: ForecastHorizon; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "1y", label: "+1yr" },
  { value: "3y", label: "+3yr" },
];

export function ForecastPage() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("now");
  const { data, isLoading, isError } = useForecast({ horizon, limit: 20 });
  const recompute = useRecomputeForecast();

  return (
    <div>
      <div className="page-header">
        <h1>Forecast Planning</h1>
        <button type="button" className="btn-ghost" disabled={recompute.isPending} onClick={() => recompute.mutate()}>
          {recompute.isPending ? "Recomputing..." : "Recompute now"}
        </button>
      </div>
      <p className="muted">
        Ranks areas by projected future need, not just today's gap — today's coverage-gap score projected forward
        with a population growth-rate proxy (a demo stand-in for real WorldPop data; see the backend for details).
        An area that looks fine today can still be a good long-term investment if it's growing fast.
      </p>

      <div className="map-controls" style={{ position: "static", marginBottom: "1rem", display: "inline-flex" }}>
        {HORIZONS.map((h) => (
          <button
            key={h.value}
            type="button"
            className={`map-select map-toggle-btn${horizon === h.value ? " map-toggle-btn-active" : ""}`}
            onClick={() => setHorizon(h.value)}
          >
            {h.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="muted">Loading...</p>}
      {isError && <p className="error-text">Could not load forecast.</p>}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Area (r7)</th>
              <th>Nearest town</th>
              <th>Score</th>
              <th>Growth %/yr</th>
              <th>Why (today)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f) => (
              <tr key={f._id}>
                <td>{f.rank}</td>
                <td>
                  <code>{f.h3_r7}</code>
                </td>
                <td>{f.nearestTown}</td>
                <td>{f.score.toFixed(1)}</td>
                <td>{f.growthRatePercent.toFixed(1)}%</td>
                <td className="comment-cell">{f.reasons.join(", ")}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  No forecast data yet — need cell aggregation to run first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
