import { Fragment } from "react";
import {
  PieChart,
  Pie,
  Cell as PieCell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  type RenderableText,
} from "recharts";
import { useStatsOverview } from "../../api/hooks";
import type { RegionStat } from "../../api/types";
import { CELL_STATUS_ORDER, STATUS_HEX, STATUS_LABEL } from "../../api/networkStatus";

// Darker than STATUS_HEX["4g_plus"] would read as a single flat fill — a
// large flat fill at typical status lightness falls just under the 3:1
// contrast-vs-surface floor on this page's white background (validated via
// the dataviz skill's palette checker); this shade clears it while still
// reading as "good".
const WELL_SERVED_BAR_FILL = "#15803d";

export function OverviewPage() {
  const { data, isLoading, isError } = useStatsOverview();

  if (isLoading) return <p className="muted">Loading overview...</p>;
  if (isError || !data) return <p className="error-text">Could not load stats. Is the backend running?</p>;

  const pieData = CELL_STATUS_ORDER.map((status) => ({ status, count: data.cellsByStatus[status] }));

  return (
    <div>
      <h1>Overview</h1>
      <div className="kpi-grid">
        <KpiCard label="National coverage" value={`${data.coveragePct}%`} sub="4G or better" />
        <KpiCard label="Cells tracked" value={data.totalCells.toLocaleString()} />
        <KpiCard label="Open reports" value={data.openReports.toLocaleString()} sub="needs triage" />
        <KpiCard label="Samples (24h)" value={data.last24hSamples.toLocaleString()} />
        <KpiCard label="Total measurements" value={data.totalMeasurements.toLocaleString()} />
      </div>

      <div className="overview-row">
        <div className="panel">
          <h2>Cells by network type</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={70} outerRadius={105} paddingAngle={2}>
                {pieData.map((entry) => (
                  <PieCell key={entry.status} fill={STATUS_HEX[entry.status]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, _name, item) => [value, STATUS_LABEL[item.payload.status as keyof typeof STATUS_LABEL]]} />
              <Legend formatter={(value: string) => STATUS_LABEL[value as keyof typeof STATUS_LABEL] ?? value} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <RegionWellServedChart regions={data.regions} />
      </div>

      <RegionBreakdown regions={data.regions} />
    </div>
  );
}

function RegionWellServedChart({ regions }: { regions: RegionStat[] }) {
  const chartData = [...regions].sort((a, b) => b.wellServedPct - a.wellServedPct);
  return (
    <div className="panel">
      <h2>4G+ coverage by region</h2>
      <p className="muted" style={{ marginTop: -4, marginBottom: 16, fontSize: "0.85rem" }}>
        % of cells at 4G or better, ranked highest first.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 32)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }} barSize={16}>
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: "#0f172a", fontSize: 12 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            formatter={(value, _name, item) => [
              `${value}% (${(item.payload as RegionStat).totalCells.toLocaleString()} cells)`,
              "4G+ coverage",
            ]}
          />
          <Bar dataKey="wellServedPct" fill={WELL_SERVED_BAR_FILL} radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="wellServedPct"
              position="right"
              formatter={(v: RenderableText) => (v === undefined || v === null ? "" : `${v}%`)}
              fill="#0f172a"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RegionBreakdown({ regions }: { regions: RegionStat[] }) {
  return (
    <div className="panel">
      <h2>Coverage by region — detail</h2>
      <p className="muted" style={{ marginTop: -4, marginBottom: 16, fontSize: "0.85rem" }}>
        Cells bucketed by nearest major town — the same reference list the MODEL step
        uses for its population proxy.
      </p>
      <div className="legend" style={{ marginBottom: 12 }}>
        {CELL_STATUS_ORDER.map((s) => (
          <Fragment key={s}>
            <span className="legend-dot" style={{ background: STATUS_HEX[s] }} /> {STATUS_LABEL[s]}
          </Fragment>
        ))}
      </div>
      <div className="region-list">
        {regions.map((r) => (
          <div className="region-row" key={r.name}>
            <div className="region-name">{r.name}</div>
            <div
              className="region-bar-track"
              title={CELL_STATUS_ORDER.map((s) => `${r.counts[s]} ${STATUS_LABEL[s]}`).join(" · ") + ` · ${Math.round(r.avgConfidence * 100)}% avg confidence`}
            >
              {CELL_STATUS_ORDER.map(
                (s) =>
                  r.counts[s] > 0 && (
                    <span key={s} style={{ flexBasis: `${(r.counts[s] / r.totalCells) * 100}%`, background: STATUS_HEX[s] }} />
                  )
              )}
            </div>
            <div className="region-value">
              {r.wellServedPct}% <span className="muted">({r.totalCells.toLocaleString()} cells)</span>
            </div>
          </div>
        ))}
        {regions.length === 0 && <p className="muted">No cells yet — need aggregation to run first.</p>}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
