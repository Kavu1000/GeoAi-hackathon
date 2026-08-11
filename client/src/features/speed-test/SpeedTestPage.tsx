import { useState } from "react";
import { useSubmitMeasurement } from "../../api/hooks";
import { captureSignalReport } from "./captureSignalReport";

type Status = "idle" | "busy" | "done" | "error";

interface Result {
  latencyMs: number;
  downloadKbps: number;
}

export function SpeedTestPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const submitMeasurement = useSubmitMeasurement();

  async function run() {
    setStatus("busy");
    setError("");

    try {
      const report = await captureSignalReport();
      setResult(report);
      setStatus("done");

      submitMeasurement.mutate({
        lat: report.lat,
        lng: report.lng,
        accuracyM: report.accuracyM,
        networkType: report.networkType,
        latencyMs: report.latencyMs,
        downloadKbps: report.downloadKbps,
        source: "speedtest",
        recordedAt: new Date().toISOString(),
      });
    } catch (err) {
      setStatus("error");
      if (err instanceof GeolocationPositionError) {
        setError("We could not get your location. Check permission and try again.");
      } else {
        setError("The speed test failed. Check your connection and try again.");
      }
    }
  }

  return (
    <section className="report-page">
      <div className="report-intro">
        <p className="eyebrow">Community coverage data</p>
        <h1>Test your speed</h1>
        <p className="muted">
          Run a quick download speed test from where you are. It gets saved with your location and helps keep
          the coverage map accurate.
        </p>
      </div>

      <div className="panel speedtest-panel">
        {status === "idle" && (
          <>
            <p className="muted">Ready when you are — this takes about 5 seconds.</p>
            <button className="btn-primary" onClick={run}>Start test</button>
          </>
        )}

        {status === "busy" && <SpeedTestBusy label="Finding your location and testing your connection…" />}

        {status === "done" && result && (
          <>
            <div className="speedtest-result">
              <span className="speedtest-kbps">{result.downloadKbps.toFixed(0)}</span>
              <span className="speedtest-unit">kbps</span>
            </div>
            <p className="muted">Latency: {result.latencyMs} ms</p>
            <p className="small muted">
              {submitMeasurement.isSuccess && "Saved to the coverage map. Thank you!"}
              {submitMeasurement.isError && "Test complete, but saving it failed — your connection may have dropped."}
              {submitMeasurement.isPending && "Saving…"}
            </p>
            <button className="btn-ghost" onClick={run}>Test again</button>
          </>
        )}

        {status === "error" && (
          <>
            <p className="error-text">{error}</p>
            <button className="btn-primary" onClick={run}>Try again</button>
          </>
        )}
      </div>
    </section>
  );
}

function SpeedTestBusy({ label }: { label: string }) {
  return (
    <div className="speedtest-busy">
      <span className="speedtest-spinner" aria-hidden="true" />
      <p className="muted">{label}</p>
    </div>
  );
}
