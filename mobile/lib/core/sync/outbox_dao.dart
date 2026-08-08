import 'package:isar/isar.dart';
import '../storage/outbox_item.dart';

class OutboxDao {
  final Isar isar;
  const OutboxDao(this.isar);

  Future<void> enqueue(OutboxKind kind, String payloadJson) async {
    final item = OutboxItem()
      ..kind = kind
      ..payloadJson = payloadJson
      ..createdAt = DateTime.now();
    await isar.writeTxn(() => isar.outboxItems.put(item));
  }

  Future<List<OutboxItem>> due({int limit = 200}) async {
    final now = DateTime.now();
    final all = await isar.outboxItems.where().sortByCreatedAt().findAll();
    return all.where((i) => i.nextAttemptAt == null || i.nextAttemptAt!.isBefore(now)).take(limit).toList();
  }

  Future<void> deleteAll(List<OutboxItem> items) async {
    await isar.writeTxn(() => isar.outboxItems.deleteAll(items.map((i) => i.id).toList()));
  }

  /// Exponential backoff capped at 6h; items untried for 30 days are dropped
  /// so a long-offline device doesn't flood the API on reconnect.
  Future<void> backoff(List<OutboxItem> items) async {
    final toDelete = <int>[];
    final toUpdate = <OutboxItem>[];
    for (final item in items) {
      if (DateTime.now().difference(item.createdAt) > const Duration(days: 30)) {
        toDelete.add(item.id);
        continue;
      }
      item.attempts += 1;
      final backoffMinutes = (5 * (1 << item.attempts.clamp(0, 6))).clamp(5, 360);
      item.nextAttemptAt = DateTime.now().add(Duration(minutes: backoffMinutes));
      toUpdate.add(item);
    }
    await isar.writeTxn(() async {
      await isar.outboxItems.deleteAll(toDelete);
      await isar.outboxItems.putAll(toUpdate);
    });
  }

  Future<int> pendingCount() => isar.outboxItems.count();
}
