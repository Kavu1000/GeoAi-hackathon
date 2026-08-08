import 'dart:convert';
import 'package:dio/dio.dart';
import '../connectivity/connectivity_service.dart';
import '../storage/outbox_item.dart';
import 'outbox_dao.dart';

/// Drains the offline outbox to the backend. Measurements upload in batches
/// of 50 via /measurements/batch; reports upload one at a time via /reports.
/// Called on app resume, on connectivity regained, and from a periodic
/// background task (see main.dart's WorkManager registration).
class SyncEngine {
  final Dio dio;
  final OutboxDao dao;
  final ConnectivityService connectivity;

  SyncEngine({required this.dio, required this.dao, required this.connectivity});

  bool _running = false;

  Future<void> drain() async {
    if (_running) return;
    _running = true;
    try {
      if (!await connectivity.hasInternet()) return;
      final due = await dao.due();
      if (due.isEmpty) return;

      final measurements = due.where((i) => i.kind == OutboxKind.measurement).toList();
      final reports = due.where((i) => i.kind == OutboxKind.report).toList();

      await _drainMeasurements(measurements);
      await _drainReports(reports);
    } finally {
      _running = false;
    }
  }

  Future<void> _drainMeasurements(List<OutboxItem> items) async {
    for (var i = 0; i < items.length; i += 50) {
      final chunk = items.sublist(i, i + 50 > items.length ? items.length : i + 50);
      final samples = chunk.map((c) => jsonDecode(c.payloadJson)).toList();
      try {
        await dio.post('/measurements/batch', data: {'samples': samples});
        await dao.deleteAll(chunk);
      } on DioException {
        await dao.backoff(chunk);
      }
    }
  }

  Future<void> _drainReports(List<OutboxItem> items) async {
    for (final item in items) {
      try {
        await dio.post('/reports', data: jsonDecode(item.payloadJson));
        await dao.deleteAll([item]);
      } on DioException {
        await dao.backoff([item]);
      }
    }
  }
}
