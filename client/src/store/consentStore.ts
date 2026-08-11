import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConsentState {
  // Default on: the Coverage Map auto-captures a location + speed reading
  // the instant it loads (see CoverageMapPage.tsx), matching the app's
  // "user-visible, reversible data collection" principle — the browser's
  // own geolocation prompt is the visible gate, this toggle is the
  // standing, always-reachable reversible control.
  shareLocationEnabled: boolean;
  setShareLocationEnabled: (enabled: boolean) => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      shareLocationEnabled: true,
      setShareLocationEnabled: (shareLocationEnabled) => set({ shareLocationEnabled }),
    }),
    { name: "lao-coverage-client-consent" }
  )
);
