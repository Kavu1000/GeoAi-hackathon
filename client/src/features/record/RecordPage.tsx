import { useEffect, useRef, useState } from "react";
import { useSubmitMeasurement } from "../../api/hooks";
import { captureSignalReport } from "../speed-test/captureSignalReport";

// Mirrors mobile's Record screen (continuous background sampling, see
// mobile/lib/features/record/) but with two deliberate differences:
// - Interval is 30s, not mobile's 8s — mobile's tick only reads a native
//   signal-strength API (cheap), while a browser has no equivalent and has
//   to run a real network probe every tick instead (see runSpeedTest.ts).
// - A much smaller download probe than the manual speed test (200KB vs
//   2MB) — repeating the full probe every 30s would be a heavy, unreasonable
//   data cost for a tab left open in the background.
// - No offline outbox: the web client doesn't need mobile's offline-first
//   guarantees (matches this project's existing design principle for the
//   web speed test) — a failed tick just counts as rejected and moves on.
const SAMPLE_INTERVAL_MS = 30_000;
const RECORD_PAYLOAD_BYTES = 200_000;

type Status = "idle" | "recording";

export function RecordPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [sentCount, setSentCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [lastUploadAt, setLastUploadAt] = useState<Date | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const submitMeasurement = useSubmitMeasurement();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Stop the interval if the user navigates away mid-recording.
  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    },
    []
  );

  async function tick() {
    try {
      const report = await captureSignalReport(RECORD_PAYLOAD_BYTES);
      await submitMeasurement.mutateAsync({
        lat: report.lat,
        lng: report.lng,
        accuracyM: report.accuracyM,
        networkType: report.networkType,
        latencyMs: report.latencyMs,
        downloadKbps: report.downloadKbps,
        source: "recording",
        recordedAt: new Date().toISOString(),
      });
      setSentCount((n) => n + 1);
      setLastUploadAt(new Date());
    } catch {
      // A single failed tick (permission hiccup, dropped connection)
      // shouldn't stop the session — it just tries again next interval.
      setRejectedCount((n) => n + 1);
    }
  }

  function start() {
    if (status === "recording") return;
    setStatus("recording");
    void tick(); // first sample immediately, don't wait a full interval
    timerRef.current = window.setInterval(() => void tick(), SAMPLE_INTERVAL_MS);
  }

  function stop() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("idle");
  }

  const recording = status === "recording";

  return (
    <section className="report-page">
      <div className="report-intro">
        <p className="eyebrow">Community coverage data</p>
        <h1>Record</h1>
        <p className="muted">
          Keep this tab open while you're out and about — it samples your location and connection speed every
          30 seconds and adds each reading to the coverage map. Stop any time.
        </p>
      </div>

      <div className="panel speedtest-panel">
        <p className="muted">
          <b>Status:</b> {recording ? "Recording" : "Ready"}
        </p>
        <p className="muted">
          <b>Connection:</b> {online ? "Online" : "Offline"}
        </p>
        <button className={recording ? "btn-ghost" : "btn-primary"} onClick={recording ? stop : start}>
          {recording ? "Stop recording" : "Start recording"}
        </button>
      </div>

      <div className="panel speedtest-panel">
        <p className="muted">
          <b>Sent:</b> {sentCount} &nbsp;&nbsp; <b>Rejected:</b> {rejectedCount}
        </p>
        <p className="small muted">
          {lastUploadAt ? `Last upload: ${lastUploadAt.toLocaleTimeString()}` : "No uploads yet this session."}
        </p>
      </div>
    </section>
  );
}
