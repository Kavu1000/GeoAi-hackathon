# Lao Coverage — mobile app (Flutter)

Coverage map, manual speed test, and issue reporting for residents and
travellers. Works offline: every measurement/report writes to a local Isar
outbox first and syncs when a connection is available.

Most of this was originally written without a local Flutter SDK to test
against; it has since been run through `flutter pub get`, the l10n/Isar code
generators, and `flutter analyze` (Flutter 3.44.9 / Dart 3.12.2) — **0
analyzer errors**, only a handful of pre-existing style lints (`const`
constructors, a couple of Material API deprecations). That pass also caught
and fixed three real bugs: a `geolocator` API mismatch
(`lib/core/location/location_service.dart`), a naming collision between the
app's own `MapController` (Riverpod notifier) and flutter_map's
`MapController` (`lib/features/map/presentation/map_screen.dart`), and a
missing import for the generated Isar collection extension
(`lib/features/settings/presentation/settings_screen.dart`). It has **not**
been run on an emulator/device or through a full `flutter build` — no
Android SDK/Xcode in this environment — so runtime behavior (permissions,
platform channels, WorkManager, FMTC's ObjectBox store) is still unverified.

## Setup

```bash
# 1. Generate platform folders (android/, ios/, etc). Since lib/ and
#    pubspec.yaml already exist, this only adds what's missing — it will
#    NOT overwrite the hand-written app/ and features/ code.
flutter create . --org com.laocoverage --project-name lao_coverage

# 2. Re-apply the two files this repo already customized, since
#    `flutter create` regenerates the Android project fresh:
#      - android/app/src/main/AndroidManifest.xml   (permissions)
#      - android/app/src/main/kotlin/.../MainActivity.kt   (signal channel)
#    Diff them against what `flutter create` produced and merge back in
#    the permissions block and the MethodChannel handler.

# 3. Fetch packages (also generates lib/l10n/generated/ — Lao + English
#    strings, see lib/l10n/*.arb — since pubspec.yaml has `generate: true`)
flutter pub get

# 4. Generate Isar's *.g.dart (OutboxItem schema)
dart run build_runner build --delete-conflicting-outputs

# 5. Run (point at your backend's LAN IP, not localhost, on a real device)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000   # Android emulator
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:4000 # physical device
```

## What's implemented (Phase 1)

- Onboarding: language pick (lo/en), location permission, consent
- Coverage map: OSM tiles + hex-cell polygons colored by status, pulled from
  `GET /cells` — including model-**predicted** cells (no real measurement
  yet, interpolated/estimated by the backend's MODEL step), rendered lighter
  and with a distinct border so they read as an estimate, not ground truth
- Offline map tiles: `flutter_map_tile_caching` caches OSM tiles to disk as
  they're viewed, so the map still renders in a dead zone — the whole point
  of an app that maps dead zones (`lib/core/map/tile_cache.dart`)
- Lao-first UI: full `flutter_localizations` setup (`lib/l10n/*.arb`),
  defaults to Lao, switchable from onboarding without an app restart
- Speed test: location + (Android-only) signal strength + a real download
  throughput measurement against the backend's `/speedtest/payload`
  endpoint, queued to the offline outbox
- Report form: no signal / slow / outage, queued the same way
- Offline outbox (Isar) + sync engine: drains on app resume, on connectivity
  regained, and via a WorkManager periodic task (15 min minimum on Android)
- Settings: background sampling toggle (wired to WorkManager), clear local
  data

## Known gaps / what's not built

- **iOS signal strength**: Apple doesn't expose cellular signal strength to
  third-party apps. `SignalService.read()` returns `null` on iOS by
  design — those samples still get download-throughput data, just no dBm.
- **No account system**: the app authenticates anonymously via a generated
  device id (`POST /auth/device`). There's no login UI because residents and
  travellers don't need one — only dashboard operators/admins do.
- **Trip planner / contributions screens**: described in the original design
  doc as stretch goals, not built here.
- **iOS platform folder**: not generated in this repo — `flutter create .`
  in step 1 above adds it.
- **Predicted-cell border style**: rendered via opacity/border-weight, not a
  true dashed stroke — flutter_map 7.0.2's base `Polygon` has no built-in
  dash pattern. Swap in a real one if a future flutter_map version adds it.
- **Lao translations**: machine-assisted best-effort (`lib/l10n/app_lo.arb`)
  — have a native speaker review before shipping.
- **Not run on a device/emulator or through `flutter build`**: analyzer-clean
  only (see note above) — no Android SDK/Xcode here to go further.

## Gotchas

- The Android emulator reaches your host machine's `localhost` via
  `10.0.2.2`, not `127.0.0.1` — that's why the default `Env.apiBaseUrl` in
  `lib/core/config/env.dart` uses it.
- WorkManager's Android minimum periodic interval is 15 minutes regardless
  of what you configure lower.
- `READ_PHONE_STATE` and location permissions must be granted at runtime
  (Android 6+) — the onboarding flow requests location, but the phone-state
  prompt happens the first time a speed test or background sample runs.
