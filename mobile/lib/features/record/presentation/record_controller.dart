import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/connectivity/connectivity_service.dart';
import '../../../core/location/location_service.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/isar_service.dart';
import '../../../core/storage/outbox_item.dart';
import '../../../core/sync/outbox_dao.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/sync/sync_stats.dart';
import '../../../core/telephony/signal_service.dart';
import '../../measurement/domain/measurement_sample.dart';

// How often a sample is taken while recording is active. Short enough to
// build a useful trail over a walk/drive, long enough not to hammer the
// battery, GPS chip, or backend.
const _sampleInterval = Duration(seconds: 8);

enum RecordStatus { idle, recording, error }

class RecordState {
  final RecordStatus status;
  final int waitingCount;
  final DateTime? oldestWaiting;
  final int sentCount;
  final int rejectedCount;
  final DateTime? lastUploadAt;
  final bool online;
  final String? error;

  const RecordState({
    this.status = RecordStatus.idle,
    this.waitingCount = 0,
    this.oldestWaiting,
    this.sentCount = 0,
    this.rejectedCount = 0,
    this.lastUploadAt,
    this.online = true,
    this.error,
  });

  RecordState copyWith({
    RecordStatus? status,
    int? waitingCount,
    DateTime? oldestWaiting,
    bool clearOldestWaiting = false,
    int? sentCount,
    int? rejectedCount,
    DateTime? lastUploadAt,
    bool? online,
    String? error,
  }) =>
      RecordState(
        status: status ?? this.status,
        waitingCount: waitingCount ?? this.waitingCount,
        oldestWaiting: clearOldestWaiting ? null : (oldestWaiting ?? this.oldestWaiting),
        sentCount: sentCount ?? this.sentCount,
        rejectedCount: rejectedCount ?? this.rejectedCount,
        lastUploadAt: lastUploadAt ?? this.lastUploadAt,
        online: online ?? this.online,
        error: error,
      );
}

final recordControllerProvider = NotifierProvider<RecordController, RecordState>(RecordController.new);

/// Drives the Record screen: a Start/Stop toggle that, while on, samples
/// location + signal every [_sampleInterval] and queues each sample through
/// the same offline-safe outbox/sync pipeline the background task and speed
/// test already use — nothing new on the backend side, just a different,
/// continuous way of feeding it. See core/sync/{outbox_dao,sync_engine}.dart.
class RecordController extends Notifier<RecordState> {
  Timer? _timer;
  late final OutboxDao _dao;

  @override
  RecordState build() {
    _dao = OutboxDao(IsarService.instance);
    ref.onDispose(() => _timer?.cancel());
    // Live "Mode: Online/Offline" without polling.
    ref.listen(isOnlineProvider, (_, next) {
      state = state.copyWith(online: next.value ?? true);
    });
    Future.microtask(refreshStats);
    return const RecordState();
  }

  Future<void> refreshStats() async {
    final stats = ref.read(syncStatsProvider);
    final waiting = await _dao.pendingCount();
    final oldest = await _dao.oldestPending();
    state = state.copyWith(
      waitingCount: waiting,
      oldestWaiting: oldest,
      clearOldestWaiting: oldest == null,
      sentCount: stats.sentCount,
      rejectedCount: stats.rejectedCount,
      lastUploadAt: stats.lastUploadAt,
    );
  }

  Future<void> start() async {
    if (state.status == RecordStatus.recording) return;
    final hasPermission = await LocationService().ensurePermission();
    if (!hasPermission) {
      state = state.copyWith(status: RecordStatus.error, error: 'Location permission is required to record.');
      return;
    }
    state = state.copyWith(status: RecordStatus.recording, error: null);
    unawaited(_tick()); // first sample immediately, don't wait a full interval
    _timer = Timer.periodic(_sampleInterval, (_) => _tick());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    if (state.status == RecordStatus.recording) {
      state = state.copyWith(status: RecordStatus.idle);
    }
  }

  Future<void> tryUploadNow() => _drain();

  Future<void> _tick() async {
    try {
      final position = await LocationService().getCurrentPosition();
      if (position == null) return; // permission revoked or GPS off mid-session — skip this tick, keep recording
      final signal = await SignalService().read();
      final sample = MeasurementSample(
        lat: position.latitude,
        lng: position.longitude,
        operator: signal?.operatorName,
        networkType: signal?.networkType ?? 'none',
        signalDbm: signal?.dbm,
        source: 'recording',
        recordedAt: DateTime.now(),
      );
      await _dao.enqueue(OutboxKind.measurement, jsonEncode(sample.toJson()));
      await refreshStats();
      unawaited(_drain());
    } catch (_) {
      // A single failed tick shouldn't stop the session — it just tries
      // again next interval.
    }
  }

  Future<void> _drain() async {
    await SyncEngine(
      dio: ref.read(dioProvider),
      dao: _dao,
      connectivity: ref.read(connectivityServiceProvider),
      stats: ref.read(syncStatsProvider),
    ).drain();
    await refreshStats();
  }
}
