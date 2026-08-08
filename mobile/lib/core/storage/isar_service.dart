import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'outbox_item.dart';

class IsarService {
  static Isar? _instance;

  static Future<Isar> open() async {
    if (_instance != null) return _instance!;
    final dir = await getApplicationDocumentsDirectory();
    _instance = await Isar.open(
      [OutboxItemSchema],
      directory: dir.path,
    );
    return _instance!;
  }

  static Isar get instance {
    final isar = _instance;
    if (isar == null) {
      throw StateError('IsarService.open() must be called during bootstrap before use.');
    }
    return isar;
  }
}
