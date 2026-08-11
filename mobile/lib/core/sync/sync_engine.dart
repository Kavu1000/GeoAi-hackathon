import 'dart:convert';
import 'package:dio/dio.dart';
import '../connectivity/connectivity_service.dart';
import '../storage/outbox_item.dart';
import 'outbox_dao.dart';
import 'sync_stats.dart';

/// Drains the offline outbox to the backend. Measurements upload in batches
/// of 50 via /measurements/batch; reports upload one at a time via /reports.
/// Called on app resume, on connectivity regained, and from a periodic
/// background task (see main.dart's WorkManager registration).
class SyncEngine {
  final Dio dio;
  final OutboxDao dao;
  final ConnectivityService connectivity;
  final SyncStats? stats;

  SyncEngine({required this.dio, required this.dao, required this.connectivity, this.stats});

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
        await stats?.recordSent(chunk.length);
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        // 4xx (bad payload, validation failure) will never succeed on
        // retry — drop it and count it as rejected rather than backing it
        // off forever. Anything else (network error, 5xx) is presumed
        // temporary and stays queued. A 401 here specifically means
        // dio_client.dart's auth-retry interceptor already tried refreshing
        // the session once and that *also* failed (e.g. fully offline, or
        // the backend's auth endpoints are down) — not the ordinary case
        // this comment originally described, but still non-retryable by
        // this point.
        if (status != null && status >= 400 && status < 500) {
          await dao.deleteAll(chunk);
          await stats?.recordRejected(chunk.length);
        } else {
          await dao.backoff(chunk);
        }
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
