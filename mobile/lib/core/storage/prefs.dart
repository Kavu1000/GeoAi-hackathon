import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('overridden in bootstrap.dart before runApp');
});

class PrefsKeys {
  PrefsKeys._();
  static const onboardingComplete = 'onboarding_complete';
  static const backgroundSamplingEnabled = 'background_sampling_enabled';
  static const locale = 'locale';

  // Cumulative counters for the Record screen (see core/sync/sync_stats.dart).
  // Outbox items are deleted once sent, so these live outside Isar — the
  // only place a running "sent so far" total survives.
  static const syncSentCount = 'sync_sent_count';
  static const syncRejectedCount = 'sync_rejected_count';
  static const syncLastUploadAtMillis = 'sync_last_upload_at_millis';
}
