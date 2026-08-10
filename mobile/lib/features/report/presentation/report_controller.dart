import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/connectivity/connectivity_service.dart';
import '../../../core/location/location_service.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/isar_service.dart';
import '../../../core/storage/outbox_item.dart';
import '../../../core/sync/outbox_dao.dart';
import '../../../core/sync/sync_engine.dart';
import '../domain/report_payload.dart';

enum ReportSubmitStatus { idle, submitting, done, error }

class ReportSubmitState {
  final ReportSubmitStatus status;
  final String? error;
  const ReportSubmitState({this.status = ReportSubmitStatus.idle, this.error});
}

final reportControllerProvider =
    NotifierProvider<ReportController, ReportSubmitState>(ReportController.new);

class ReportController extends Notifier<ReportSubmitState> {
  @override
  ReportSubmitState build() => const ReportSubmitState();

  Future<void> submit({
    required SignalType signalType,
    MobileOperator? operator,
    String? province,
    String? comment,
  }) async {
    state = const ReportSubmitState(status: ReportSubmitStatus.submitting);
    try {
      final position = await LocationService().getCurrentPosition();
      if (position == null) {
        state = const ReportSubmitState(
            status: ReportSubmitStatus.error,
            error: 'Location permission required');
        return;
      }

      final payload = ReportPayload(
        lat: position.latitude,
        lng: position.longitude,
        signalType: signalType,
        operator: operator,
        province: province,
        comment: comment,
      );

      final dao = OutboxDao(IsarService.instance);
      await dao.enqueue(OutboxKind.report, jsonEncode(payload.toJson()));

      SyncEngine(
        dio: ref.read(dioProvider),
        dao: dao,
        connectivity: ref.read(connectivityServiceProvider),
      ).drain().ignore();

      state = const ReportSubmitState(status: ReportSubmitStatus.done);
    } catch (e) {
      state =
          ReportSubmitState(status: ReportSubmitStatus.error, error: e.toString());
    }
  }
}
