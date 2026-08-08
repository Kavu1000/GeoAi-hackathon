import 'package:isar/isar.dart';

part 'outbox_item.g.dart';

enum OutboxKind { measurement, report }

@collection
class OutboxItem {
  Id id = Isar.autoIncrement;

  @enumerated
  late OutboxKind kind;

  /// JSON-encoded payload matching the backend's expected request body
  /// for that kind (a single measurement sample, or a report).
  late String payloadJson;

  @Index()
  late DateTime createdAt;

  int attempts = 0;

  DateTime? nextAttemptAt;
}
