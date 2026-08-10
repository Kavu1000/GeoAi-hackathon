import { useState } from "react";
import { useSubmitMeasurement } from "../../api/hooks";
import { detectNetworkType, runSpeedTest } from "./runSpeedTest";

type Status = "idle" | "locating" | "testing" | "done" | "error";

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
    setStatus("locating");
    setError("");

    if (!navigator.geolocation) {
      setStatus("error");
      setError("Location is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setStatus("testing");
        try {
          const speed = await runSpeedTest();
          setResult(speed);
          setStatus("done");

          submitMeasurement.mutate({
            lat: coords.latitude,
            lng: coords.longitude,
            networkType: detectNetworkType(),
            latencyMs: speed.latencyMs,
            downloadKbps: speed.downloadKbps,
            source: "speedtest",
            recordedAt: new Date().toISOString(),
          });
        } catch {
          setStatus("error");
          setError("The speed test failed. Check your connection and try again.");
        }
      },
      () => {
        setStatus("error");
        setError("We could not get your location. Check permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
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

        {status === "locating" && <SpeedTestBusy label="Finding your location…" />}
        {status === "testing" && <SpeedTestBusy label="Testing your connection…" />}

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
