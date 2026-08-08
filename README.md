# Lao Rural Connectivity Map

AI-assisted mapping of internet coverage in rural Laos: a Flutter app collects
signal/speed samples and user reports from residents and travellers, a
Node.js/MongoDB backend aggregates them into hex-cell coverage status and
tower-siting recommendations, and a React dashboard gives operators a map,
report queue, and prioritized build list.

## Structure

- `backend/` — Express + TypeScript + MongoDB API and aggregation jobs
- `dashboard/` — React + Vite admin dashboard (map, reports, recommendations)
- `mobile/` — Flutter app (coverage map, speed test, reporting, offline sync)

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

### 3. Dashboard

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

### 4. Mobile app

Requires the Flutter SDK (not installed in this build environment — the
Dart code is written and reviewed but hasn't been run through `flutter
analyze`/`flutter run`). See [mobile/README.md](mobile/README.md) for the
full first-run steps (`flutter create .` to generate platform folders,
re-applying the custom Android manifest/MainActivity, codegen for Isar).

```bash
cd mobile
flutter create . --org com.laocoverage --project-name lao_coverage
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

## Status

Backend and dashboard are implemented, running, and verified end-to-end in
this environment (see below). Mobile is fully coded for Phase 1 but
untested against a real Flutter toolchain — see
[mobile/README.md](mobile/README.md) for known gaps.

### Verified working

- **Backend**: `npm run build` type-checks clean; live-tested the full
  pipeline — device auth, admin login/RBAC, `/measurements/batch` ingest,
  `/reports` create + triage, cell aggregation job, `/cells` GeoJSON output,
  `/recommendations` scoring, `/stats/overview`, and `/speedtest/payload`.
- **Dashboard**: `npm run build` succeeds; browser-tested with Playwright —
  login, Overview KPIs, Coverage Map (hex rendering + tooltip), Reports
  table, and Recommendations table all render live backend data with zero
  console errors.
- **Mobile**: code-reviewed for consistency (provider wiring, platform
  channel contract, Isar/WorkManager API usage) but not compiled — there's
  no Flutter SDK in this environment. Follow mobile/README.md's setup steps
  before treating it as verified.

## Phase 1 scope (what's implemented now)

- Backend: device + email/password auth, `/measurements/batch` ingest,
  `/reports` CRUD + triage, `/cells` (H3 aggregation to GeoJSON),
  `/recommendations` (tower-siting scoring), `/stats/overview`,
  `/speedtest/payload`, and a cron job that recomputes cell status +
  recommendations every 15 minutes.
- Dashboard: login, coverage map (MapLibre + deck.gl GeoJsonLayer), reports
  table with status workflow, recommendations table, overview KPIs.
- Mobile: onboarding (language/permission/consent), coverage map, manual
  speed test (real throughput measurement against the backend) → measurement
  submission, report form, offline outbox + sync engine + WorkManager
  background sampling, settings (background toggle, clear local data).

Not built (documented as stretch goals): trip planner, contributions/
leaderboard screen, population-weighted recommendation scoring (currently
uses report volume + sample density as the demand proxy — swap in a
WorldPop/Open Buildings join later), outage-alert notifications.
# GeoAi-hackathon
