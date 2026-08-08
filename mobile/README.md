# Lao Coverage — mobile app (Flutter)

Coverage map, manual speed test, and issue reporting for residents and
travellers. Works offline: every measurement/report writes to a local Isar
outbox first and syncs when a connection is available.

This code was written without a local Flutter SDK to test against — see
**Setup** below for the steps to get it running for the first time.

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

# 3. Fetch packages
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
  `GET /cells`
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
- **iOS platform folder**: not generated in this environment (no Flutter
  SDK) — `flutter create .` in step 1 above adds it.

## Gotchas

- The Android emulator reaches your host machine's `localhost` via
  `10.0.2.2`, not `127.0.0.1` — that's why the default `Env.apiBaseUrl` in
  `lib/core/config/env.dart` uses it.
- WorkManager's Android minimum periodic interval is 15 minutes regardless
  of what you configure lower.
- `READ_PHONE_STATE` and location permissions must be granted at runtime
  (Android 6+) — the onboarding flow requests location, but the phone-state
  prompt happens the first time a speed test or background sample runs.
