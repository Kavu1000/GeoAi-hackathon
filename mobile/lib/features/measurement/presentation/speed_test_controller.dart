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
import '../domain/measurement_sample.dart';
import '../domain/run_speed_test.dart';

enum SpeedTestStatus { idle, measuringSignal, testingSpeed, done, error }

class SpeedTestState {
  final SpeedTestStatus status;
  final SpeedTestResult? result;
  final String? error;
  const SpeedTestState({this.status = SpeedTestStatus.idle, this.result, this.error});

  SpeedTestState copyWith({SpeedTestStatus? status, SpeedTestResult? result, String? error}) => SpeedTestState(
        status: status ?? this.status,
        result: result ?? this.result,
        error: error,
      );
}

final speedTestControllerProvider = NotifierProvider<SpeedTestController, SpeedTestState>(SpeedTestController.new);

class SpeedTestController extends Notifier<SpeedTestState> {
  @override
  SpeedTestState build() => const SpeedTestState();

  Future<void> run() async {
    state = state.copyWith(status: SpeedTestStatus.measuringSignal);
    try {
      final position = await LocationService().getCurrentPosition();
      if (position == null) {
        state = state.copyWith(status: SpeedTestStatus.error, error: 'Location permission required');
        return;
      }
      final signal = await SignalService().read();

      state = state.copyWith(status: SpeedTestStatus.testingSpeed);
      final result = await RunSpeedTest(ref.read(dioProvider)).call();

      final sample = MeasurementSample(
        lat: position.latitude,
        lng: position.longitude,
        operator: signal?.operatorName,
        networkType: signal?.networkType ?? 'none',
        signalDbm: signal?.dbm,
        latencyMs: result.latencyMs,
        downloadKbps: result.downloadKbps,
        source: 'speedtest',
        recordedAt: DateTime.now(),
      );

      final dao = OutboxDao(IsarService.instance);
      await dao.enqueue(OutboxKind.measurement, jsonEncode(sample.toJson()));

      // Best-effort immediate sync so the contribution lands right away when
      // online; if it fails, the periodic/on-resume sync will catch it later.
      SyncEngine(
        dio: ref.read(dioProvider),
        dao: dao,
        connectivity: ref.read(connectivityServiceProvider),
        stats: ref.read(syncStatsProvider),
      ).drain().ignore();

      state = state.copyWith(status: SpeedTestStatus.done, result: result);
    } catch (e) {
      state = state.copyWith(status: SpeedTestStatus.error, error: e.toString());
    }
  }
}
