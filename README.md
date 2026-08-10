# Connect4All (Lao Rural Connectivity Map)

> *See before you go. Build where it matters.*

AI-assisted mapping of internet coverage in rural Laos: a Flutter app
captures real signal/speed samples and user reports on-device (offline
outbox, syncs the moment signal returns), a Node.js/MongoDB backend turns
those into hex-cell coverage status and **predicts coverage for every hex
across the country — even ones nobody has visited — scored by confidence**,
and a React dashboard gives ISPs/telecoms/government a map and a
prioritized, AI-explained tower-siting shortlist.

## How it works (CAPTURE → SYNC → MODEL → MAP)

1. **CAPTURE** — the mobile app records signal strength/type/latency on
   every trip, saved to an on-device Isar outbox first
   ([mobile/lib/core/telephony/](mobile/lib/core/telephony/)).
2. **SYNC** — the outbox drains to the backend the moment a connection is
   available (app resume, connectivity change, or a WorkManager background
   tick) — nothing is lost in a dead zone
   ([mobile/lib/core/sync/](mobile/lib/core/sync/)).
3. **MODEL** — the backend aggregates real measurements into hex cells
   ([backend/src/jobs/aggregateCells.job.ts](backend/src/jobs/aggregateCells.job.ts)),
   then fills in every other hex across Laos by interpolating from nearby
   measurements (falling back to a population-density proxy where there's
   nothing nearby), each with a confidence score
   ([backend/src/services/predictionGrid.service.ts](backend/src/services/predictionGrid.service.ts),
   [backend/src/jobs/predictCoverage.job.ts](backend/src/jobs/predictCoverage.job.ts)).
   DeepSeek R1, via OpenRouter, then writes a plain-language reason for the
   top tower-siting candidates — blending the signal gap, the population
   proxy, and how confident the model is
   ([backend/src/services/recommendationAi.service.ts](backend/src/services/recommendationAi.service.ts)).
4. **MAP** — a color-coded hex map (dashboard: MapLibre + deck.gl; mobile:
   flutter_map), cached for offline use on the phone via
   `flutter_map_tile_caching`. Predicted cells render distinctly (dashed
   outline on the dashboard, lighter fill on mobile) from measured ones.

## Structure

- `backend/` — Express + TypeScript + MongoDB API, aggregation jobs, and the
  MODEL step (prediction infill + DeepSeek R1 recommendation reasoning)
- `dashboard/` — React + Vite admin dashboard (map, reports, recommendations)
- `mobile/` — Flutter app (coverage map, speed test, reporting, offline sync,
  offline tile cache, Lao-first localization)

## Quick start

### 1. MongoDB

You need a MongoDB instance. Easiest local option:

```bash
docker run -d --name lao-mongo -p 27017:27017 mongo:7
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

`OPENROUTER_API_KEY` in `.env` is optional — the MODEL step's ranking and
prediction infill work without it; leaving it unset just means
recommendations fall back to plain (non-AI-authored) reason strings instead
of DeepSeek R1's summaries. Get a key at https://openrouter.ai/keys.

### 3. Dashboard

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

### 4. Mobile app

```bash
cd mobile
flutter create . --org com.connect4all --project-name connect4all
flutter pub get     # also generates lib/l10n/generated/ (Lao + English)
dart run build_runner build --delete-conflicting-outputs
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

See [mobile/README.md](mobile/README.md) for the full first-run steps
(re-applying the custom Android manifest/MainActivity that `flutter create`
would otherwise overwrite) and current verification status.

## Status

### Verified working

- **Backend**: `npm run build` type-checks clean; live-tested the full
  pipeline end-to-end against a real MongoDB instance — device auth, admin
  login/RBAC, `/measurements/batch` ingest, `/reports` create + triage, cell
  aggregation, the full-Laos prediction infill (40,823 hex cells generated
  and queryable via `/cells` with correct `predicted`/`confidence` fields),
  `/recommendations` scoring (graceful no-op when `OPENROUTER_API_KEY` is
  unset — no crash), `/stats/overview`, and `/speedtest/payload`.
- **Dashboard**: `npm run build` succeeds (including the new
  `@deck.gl/extensions` dashed-border rendering for predicted cells).
- **Mobile**: `flutter analyze` (Flutter 3.44.9 / Dart 3.12.2) passes with
  **0 errors** after `flutter pub get` + Isar/l10n codegen — only a handful
  of pre-existing style lints remain. That pass also caught and fixed three
  real bugs (a `geolocator` API mismatch, a `MapController` naming
  collision with flutter_map, and a missing Isar-extension import) that
  predate this change and were previously undetected for lack of a local
  Flutter SDK. Not yet run on a device/emulator — see
  [mobile/README.md](mobile/README.md).

## Phase 1 scope (what's implemented now)

- **Backend**: device + email/password auth, `/measurements/batch` ingest,
  `/reports` CRUD + triage, `/cells` (H3 aggregation to GeoJSON, including
  predicted/interpolated cells), `/recommendations` (tower-siting scoring
  blending coverage gaps, report volume, a population-density proxy, and
  prediction confidence, with DeepSeek R1-authored reasons for the top
  candidates), `/stats/overview`, `/speedtest/payload`, a 15-minute cron for
  real-data aggregation + scoring, and a daily cron for the full-country
  prediction infill.
- **Dashboard**: login, coverage map (MapLibre + deck.gl, measured cells
  solid / predicted cells dashed), reports table with status workflow,
  recommendations table (score, population proxy, confidence, AI-authored
  "why"), overview KPIs.
- **Mobile**: onboarding (Lao/English language pick, permission, consent),
  coverage map with offline tile caching, manual speed test (real
  throughput measurement) → measurement submission, report form, offline
  outbox + sync engine + WorkManager background sampling, settings
  (background toggle, clear local data), full Lao-first localization.

## Coverage taxonomy

Cells are classified by **network generation** — None / 2G / 3G / 4G / 4G+ /
5G — not a generic signal-quality score, so the map answers "what
technology works here" directly. Colors (gray → blue → green → orange →
crimson → purple) are validated for colorblind separation and contrast
against both the dashboard's white surface and the mobile app's dark one
(see `dashboard/src/api/networkStatus.ts` and
`mobile/lib/app/theme/coverage_colors.dart` — same hex values in both).
"4G+" is a throughput heuristic (4G readings averaging ≥15 Mbps), not true
carrier-aggregation detection — Android's basic network-type API doesn't
expose that distinction. Tower-siting recommendations
([backend/src/jobs/scoreRecommendations.job.ts](backend/src/jobs/scoreRecommendations.job.ts))
treat anything below 4G as underserved.

## Known simplifications (by design, for hackathon scope)

- **Population/building data** is a synthetic gravity-model proxy over
  Laos's known population centers
  ([backend/src/services/populationProxy.service.ts](backend/src/services/populationProxy.service.ts)),
  not a real WorldPop/Meta HRSL/Google Open Buildings raster join — those
  are large GeoTIFF datasets needing a geoprocessing pipeline (GDAL). Swap
  in a real join without touching the rest of the pipeline; it just
  consumes a 0..1 score per coordinate.
- **Laos's boundary**, used to generate the full-country prediction grid, is
  a hand-simplified ~20-point polygon
  ([backend/src/data/laosBoundary.ts](backend/src/data/laosBoundary.ts)),
  not a survey-grade admin boundary.
- **Terrain and distance-to-tower** are not modeled separately from the
  population proxy — no elevation/tower-location data source is wired in
  yet.
- **DeepSeek R1** writes reasons for the top ~200 ranked areas, not every
  predicted cell — a full-country grid is tens of thousands of cells, which
  is arithmetic (the interpolation model), not something worth an LLM call
  per cell.
