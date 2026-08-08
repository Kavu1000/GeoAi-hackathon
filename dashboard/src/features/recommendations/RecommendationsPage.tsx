import { useRecommendations } from "../../api/hooks";

export function RecommendationsPage() {
  const { data, isLoading, isError } = useRecommendations();

  return (
    <div>
      <h1>Tower Siting Recommendations</h1>
      <p className="muted">
        Ranked by unmet demand: uncovered cells nearby, user report volume, and sample density. Export this list to
        planning teams.
      </p>

      {isLoading && <p className="muted">Loading...</p>}
      {isError && <p className="error-text">Could not load recommendations.</p>}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Area (r7)</th>
              <th>Score</th>
              <th>Reports</th>
              <th>Samples</th>
              <th>Why</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((rec) => (
              <tr key={rec._id}>
                <td>{rec.rank}</td>
                <td>
                  <code>{rec.h3_r7}</code>
                </td>
                <td>{rec.score.toFixed(1)}</td>
                <td>{rec.reportCount}</td>
                <td>{rec.sampleCount}</td>
                <td className="comment-cell">{rec.reasons.join(", ")}</td>
                <td>
                  <span className={`status-pill status-${rec.status}`}>{rec.status}</span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  No recommendations yet — need cell aggregation to run first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
