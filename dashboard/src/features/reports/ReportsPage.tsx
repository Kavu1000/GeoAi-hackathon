import { useState } from "react";
import { useMeasurements, useReports, useUpdateReportStatus } from "../../api/hooks";
import type { MeasurementSource, ReportStatus } from "../../api/types";
import { STATUS_HEX, STATUS_LABEL } from "../../api/networkStatus";

const STATUS_OPTIONS: ReportStatus[] = ["new", "reviewed", "resolved"];
const SOURCE_OPTIONS: MeasurementSource[] = ["recording", "speedtest", "auto"];
const SOURCE_LABEL: Record<MeasurementSource, string> = {
  recording: "Recording session",
  speedtest: "Speed test",
  auto: "Background (auto)",
};
// Measurement's networkType has "wifi" where CellStatus (networkStatus.ts)
// doesn't, and lacks "4g_plus" (that distinction only exists once samples
// are aggregated into a Cell) — one extra entry covers the gap rather than
// widening the shared type for a single display case.
const NETWORK_LABEL: Record<string, string> = { ...STATUS_LABEL, wifi: "Wi-Fi" };
const NETWORK_HEX: Record<string, string> = { ...STATUS_HEX, wifi: "#0891b2" };

// "Reports" now covers everything a resident/traveller can send in: the
// user-submitted "I have no signal here" pins (category/comment, with a
// triage workflow) AND the mobile app's raw measurement records (Record
// screen, speed tests, the passive background task) — previously only
// visible indirectly, aggregated into the map's Cell polygons. These are
// different shapes (Report has a status workflow, Measurement doesn't; vice
// versa for network readings), so rather than force them into one table
// with mostly-empty columns, a Type selector swaps which collection is
// queried and displayed, each fully paginated on its own — merging two
// independently-paginated Mongo collections into one sorted, page-able list
// isn't worth the complexity it'd add here.
type ViewType = "reports" | "measurements";

export function ReportsPage() {
  const [view, setView] = useState<ViewType>("reports");
  const [status, setStatus] = useState<ReportStatus | undefined>(undefined);
  const [source, setSource] = useState<MeasurementSource | undefined>(undefined);
  const [page, setPage] = useState(1);

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            value={view}
            onChange={(e) => {
              setPage(1);
              setView(e.target.value as ViewType);
            }}
          >
            <option value="reports">User Reports</option>
            <option value="measurements">Mobile Records</option>
          </select>
          {view === "reports" ? (
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
          ) : (
            <select
              value={source ?? "all"}
              onChange={(e) => {
                setPage(1);
                setSource(e.target.value === "all" ? undefined : (e.target.value as MeasurementSource));
              }}
            >
              <option value="all">All sources</option>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {view === "reports" ? (
        <ReportsTable status={status} page={page} onPageChange={setPage} />
      ) : (
        <MeasurementsTable source={source} page={page} onPageChange={setPage} />
      )}
    </div>
  );
}

function ReportsTable({
  status,
  page,
  onPageChange,
}: {
  status?: ReportStatus;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data, isLoading, isError } = useReports({ status, page });
  const updateStatus = useUpdateReportStatus();

  return (
    <>
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

          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={onPageChange} />
        </>
      )}
    </>
  );
}

function MeasurementsTable({
  source,
  page,
  onPageChange,
}: {
  source?: MeasurementSource;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data, isLoading, isError } = useMeasurements({ source, page });

  return (
    <>
      {isLoading && <p className="muted">Loading records...</p>}
      {isError && <p className="error-text">Could not load records.</p>}

      {data && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Source</th>
                <th>Network</th>
                <th>Operator</th>
                <th>Signal (dBm)</th>
                <th>Download (Kbps)</th>
                <th>Latency (ms)</th>
                <th>Cell (r8)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id}>
                  <td>{new Date(m.recordedAt).toLocaleString()}</td>
                  <td>{SOURCE_LABEL[m.source]}</td>
                  <td>
                    <span className="badge" style={{ background: `${NETWORK_HEX[m.networkType]}20`, color: NETWORK_HEX[m.networkType] }}>
                      {NETWORK_LABEL[m.networkType] ?? m.networkType}
                    </span>
                  </td>
                  <td>{m.operator ?? "—"}</td>
                  <td>{m.signalDbm ?? "—"}</td>
                  <td>{m.downloadKbps ? Math.round(m.downloadKbps).toLocaleString() : "—"}</td>
                  <td>{m.latencyMs ?? "—"}</td>
                  <td>
                    <code>{m.h3_r8}</code>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>
                    No records for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={onPageChange} />
        </>
      )}
    </>
  );
}

function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <button className="btn-ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {page} · {total} total
      </span>
      <button className="btn-ghost" disabled={page * limit >= total} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
