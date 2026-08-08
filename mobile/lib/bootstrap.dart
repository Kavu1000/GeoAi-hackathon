import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app/app.dart';
import 'core/map/tile_cache.dart';
import 'core/storage/isar_service.dart';
import 'core/storage/prefs.dart';
import 'core/sync/background_task.dart';
import 'features/auth/presentation/auth_providers.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  await IsarService.open();
  await TileCache.init();
  final prefs = await SharedPreferences.getInstance();

  await BackgroundSync.init();
  final backgroundSamplingEnabled = prefs.getBool(PrefsKeys.backgroundSamplingEnabled) ?? true;
  if (backgroundSamplingEnabled) {
    await BackgroundSync.enable();
  }

  final container = ProviderContainer(
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
  );

  // Anonymous device session must exist before any authed request fires.
  // Failures here are non-fatal (e.g. first launch with no connectivity) —
  // ensureSession() is retried lazily by callers that need auth.
  try {
    await container.read(authRepositoryProvider).ensureSession();
  } catch (_) {
    // offline on first launch; screens that need auth will surface their own errors
  }

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const App(),
    ),
  );
}
