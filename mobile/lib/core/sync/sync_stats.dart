import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../storage/prefs.dart';

/// Cumulative upload counters for the Record screen — "Sent", "Rejected",
/// "Last successful upload". Outbox items are deleted as soon as they're
/// sent (see OutboxDao), so nothing about upload history survives in Isar;
/// this is that history, kept in SharedPreferences instead.
class SyncStats {
  final SharedPreferences prefs;
  const SyncStats(this.prefs);

  int get sentCount => prefs.getInt(PrefsKeys.syncSentCount) ?? 0;
  int get rejectedCount => prefs.getInt(PrefsKeys.syncRejectedCount) ?? 0;

  DateTime? get lastUploadAt {
    final millis = prefs.getInt(PrefsKeys.syncLastUploadAtMillis);
    return millis == null ? null : DateTime.fromMillisecondsSinceEpoch(millis);
  }

  /// Call when a batch of [count] samples was accepted by the backend.
  Future<void> recordSent(int count) async {
    await prefs.setInt(PrefsKeys.syncSentCount, sentCount + count);
    await prefs.setInt(PrefsKeys.syncLastUploadAtMillis, DateTime.now().millisecondsSinceEpoch);
  }

  /// Call when a batch of [count] samples was permanently rejected (a 4xx —
  /// retrying won't help, see SyncEngine) rather than dropped for a
  /// temporary/network reason.
  Future<void> recordRejected(int count) async {
    await prefs.setInt(PrefsKeys.syncRejectedCount, rejectedCount + count);
  }
}

final syncStatsProvider = Provider<SyncStats>((ref) {
  return SyncStats(ref.watch(sharedPreferencesProvider));
});
