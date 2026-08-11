import { api } from "../../api/client";
import type { NetworkType } from "../../api/types";

export interface SpeedTestResult {
  latencyMs: number;
  downloadKbps: number;
}

export const DEFAULT_PAYLOAD_BYTES = 2_000_000; // 2MB — same probe size the mobile app uses

// Pings /health for latency, then downloads a known-size payload from
// /speedtest/payload and derives kbps from bytes-per-second. Mirrors
// mobile/lib/features/measurement/domain/run_speed_test.dart so both
// clients measure the same way. `bytes` is overridable — RecordPage's
// repeated ticks use a much smaller probe than a one-shot manual test,
// since downloading the full 2MB every ~30s while recording would be a
// heavy, unreasonable data cost for a passive background page.
export async function runSpeedTest(bytes: number = DEFAULT_PAYLOAD_BYTES): Promise<SpeedTestResult> {
  const pingStart = performance.now();
  await api.get("/health");
  const latencyMs = Math.round(performance.now() - pingStart);

  const downloadStart = performance.now();
  await api.get("/speedtest/payload", {
    params: { bytes },
    responseType: "arraybuffer",
  });
  const elapsedSeconds = (performance.now() - downloadStart) / 1000;
  const downloadKbps = elapsedSeconds > 0 ? (bytes * 8) / 1000 / elapsedSeconds : 0;

  return { latencyMs, downloadKbps };
}

// Browsers can't read cellular signal strength (no equivalent of Android's
// TelephonyManager) or the carrier name — the Network Information API only
// gives an approximate connection class, and only in Chromium browsers.
// Safari/Firefox report nothing, so this falls back to "wifi" as the most
// common desktop/laptop case rather than guessing at a mobile radio type.
export function detectNetworkType(): NetworkType {
  const connection = (navigator as { connection?: { type?: string; effectiveType?: string } }).connection;
  if (!connection) return "wifi";
  if (connection.type === "wifi") return "wifi";
  if (connection.type === "cellular") {
    switch (connection.effectiveType) {
      case "slow-2g":
      case "2g":
        return "2g";
      case "3g":
        return "3g";
      case "4g":
        return "4g";
      default:
        return "none";
    }
  }
  return "wifi";
}
