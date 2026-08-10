import { useState } from "react";
import { useReports, useUpdateReportStatus } from "../../api/hooks";
import type { ReportStatus } from "../../api/types";

const STATUS_OPTIONS: ReportStatus[] = ["new", "reviewed", "resolved"];

export function ReportsPage() {
  const [status, setStatus] = useState<ReportStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useReports({ status, page });
  const updateStatus = useUpdateReportStatus();

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <select
          value={status ?? "all"}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value === "all" ? undefined : (e.target.value as ReportStatus));
          }}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="muted">Loading reports...</p>}
      {isError && <p className="error-text">Could not load reports.</p>}

      {data && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Signal Type</th>
                <th>Operator</th>
                <th>Province</th>
                <th>Comment</th>
                <th>Cell (r8)</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => {
                const signalDisplay = r.signal_type || r.category || "—";
                return (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${signalDisplay.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                        {signalDisplay}
                      </span>
                    </td>
                    <td>{r.operator ?? "—"}</td>
                    <td>{r.province ?? "—"}</td>
                    <td className="comment-cell">{r.comment ?? "—"}</td>
                    <td>
                      <code>{r.h3_r8}</code>
                    </td>
                    <td>
                      <span className={`status-pill status-${r.status}`}>{r.status}</span>
                    </td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus.mutate({ id: r._id, status: e.target.value as ReportStatus })}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>
                    No reports for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {data.page} · {data.total} total
            </span>
            <button
              className="btn-ghost"
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
