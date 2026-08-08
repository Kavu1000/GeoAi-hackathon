import { PieChart, Pie, Cell as PieCell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useStatsOverview } from "../../api/hooks";

const STATUS_COLOR: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export function OverviewPage() {
  const { data, isLoading, isError } = useStatsOverview();

  if (isLoading) return <p className="muted">Loading overview...</p>;
  if (isError || !data) return <p className="error-text">Could not load stats. Is the backend running?</p>;

  const pieData = Object.entries(data.cellsByStatus).map(([status, count]) => ({ status, count }));

  return (
    <div>
      <h1>Overview</h1>
      <div className="kpi-grid">
        <KpiCard label="National coverage" value={`${data.coveragePct}%`} sub="green + yellow cells" />
        <KpiCard label="Cells tracked" value={data.totalCells.toLocaleString()} />
        <KpiCard label="Open reports" value={data.openReports.toLocaleString()} sub="needs triage" />
        <KpiCard label="Samples (24h)" value={data.last24hSamples.toLocaleString()} />
        <KpiCard label="Total measurements" value={data.totalMeasurements.toLocaleString()} />
      </div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <h2>Cells by status</h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {pieData.map((entry) => (
                <PieCell key={entry.status} fill={STATUS_COLOR[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
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
