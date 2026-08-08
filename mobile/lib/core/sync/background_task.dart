import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:workmanager/workmanager.dart';
import '../config/env.dart';
import '../connectivity/connectivity_service.dart';
import '../location/location_service.dart';
import '../storage/isar_service.dart';
import '../storage/outbox_item.dart';
import '../telephony/signal_service.dart';
import 'outbox_dao.dart';
import 'sync_engine.dart';

const backgroundSyncTaskName = 'lao_coverage.periodic_sample';

/// Runs in a separate background isolate (no access to the app's Riverpod
/// container), so it builds its own Dio/Isar instances from scratch. Reads
/// one location + signal sample, queues it, then drains whatever's pending.
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      await IsarService.open();

      final dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'access_token');
      if (token != null) dio.options.headers['Authorization'] = 'Bearer $token';

      final dao = OutboxDao(IsarService.instance);

      final position = await LocationService().getCurrentPosition();
      if (position != null) {
        final signal = await SignalService().read();
        final sample = {
          'lat': position.latitude,
          'lng': position.longitude,
          if (signal?.operatorName != null) 'operator': signal!.operatorName,
          'networkType': signal?.networkType ?? 'none',
          if (signal?.dbm != null) 'signalDbm': signal!.dbm,
          'source': 'auto',
          'recordedAt': DateTime.now().toUtc().toIso8601String(),
        };
        await dao.enqueue(OutboxKind.measurement, jsonEncode(sample));
      }

      await SyncEngine(
        dio: dio,
        dao: dao,
        connectivity: ConnectivityService(Connectivity()),
      ).drain();

      return true;
    } catch (_) {
      return false;
    }
  });
}

class BackgroundSync {
  static Future<void> init() => Workmanager().initialize(callbackDispatcher);

  static Future<void> enable() => Workmanager().registerPeriodicTask(
        backgroundSyncTaskName,
        backgroundSyncTaskName,
        frequency: const Duration(minutes: 15), // Android's floor for periodic tasks
        constraints: Constraints(networkType: NetworkType.not_required),
      );

  static Future<void> disable() => Workmanager().cancelByUniqueName(backgroundSyncTaskName);
}
