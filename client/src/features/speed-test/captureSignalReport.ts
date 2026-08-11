import { runSpeedTest, detectNetworkType } from "./runSpeedTest";
import type { NetworkType } from "../../api/types";

export interface SignalReport {
  lat: number;
  lng: number;
  accuracyM: number;
  networkType: NetworkType;
  latencyMs: number;
  downloadKbps: number;
}

// navigator.geolocation.getCurrentPosition -> runSpeedTest() -> a ready-to-
// submit report. Extracted out of SpeedTestPage's manual button flow so
// CoverageMapPage can run the exact same capture automatically on load
// (gated by consentStore) without duplicating the logic. Rejects with the
// raw GeolocationPositionError on a location failure (callers that care
// about PERMISSION_DENIED specifically can check err.code), or a plain
// Error if the speed test itself fails.
export function captureSignalReport(): Promise<SignalReport> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation_unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        runSpeedTest()
          .then((speed) =>
            resolve({
              lat: coords.latitude,
              lng: coords.longitude,
              accuracyM: coords.accuracy,
              networkType: detectNetworkType(),
              latencyMs: speed.latencyMs,
              downloadKbps: speed.downloadKbps,
            })
          )
          .catch(reject);
      },
      reject,
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  });
}
