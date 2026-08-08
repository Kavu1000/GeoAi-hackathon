import 'dart:io';
import 'package:flutter/services.dart';
import 'signal_reading.dart';

/// Android exposes cell signal strength via TelephonyManager; iOS does not
/// expose this to third-party apps at all, so on iOS this always returns
/// null and the app falls back to speed-test-only measurements.
/// See android/app/src/main/kotlin/.../MainActivity.kt for the native side.
class SignalService {
  static const _channel = MethodChannel('lao_coverage/signal');

  Future<SignalReading?> read() async {
    if (!Platform.isAndroid) return null;
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>('read');
      if (result == null) return null;
      return SignalReading.fromMap(result);
    } on PlatformException {
      return null;
    }
  }
}
