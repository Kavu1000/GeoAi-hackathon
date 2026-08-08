import 'package:dio/dio.dart';

class SpeedTestResult {
  final int latencyMs;
  final double downloadKbps;
  const SpeedTestResult({required this.latencyMs, required this.downloadKbps});
}

/// Pings /health for latency, then downloads a known-size payload from
/// /speedtest/payload and derives kbps from bytes-per-second.
class RunSpeedTest {
  final Dio dio;
  const RunSpeedTest(this.dio);

  static const _payloadBytes = 2000000; // 2MB

  Future<SpeedTestResult> call() async {
    final pingStart = DateTime.now();
    await dio.get('/health');
    final latencyMs = DateTime.now().difference(pingStart).inMilliseconds;

    final downloadStart = DateTime.now();
    await dio.get<List<int>>(
      '/speedtest/payload',
      queryParameters: {'bytes': _payloadBytes},
      options: Options(responseType: ResponseType.bytes),
    );
    final elapsedSeconds = DateTime.now().difference(downloadStart).inMilliseconds / 1000;
    final kbps = elapsedSeconds > 0 ? (_payloadBytes * 8 / 1000) / elapsedSeconds : 0.0;

    return SpeedTestResult(latencyMs: latencyMs, downloadKbps: kbps);
  }
}
