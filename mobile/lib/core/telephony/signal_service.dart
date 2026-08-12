import 'dart:io';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'signal_reading.dart';

/// Android exposes cell signal strength via TelephonyManager; iOS does not
/// expose this to third-party apps at all, so on iOS this always returns
/// null and the app falls back to speed-test-only measurements.
/// See android/app/src/main/kotlin/.../MainActivity.kt for the native side.
class SignalService {
  static const _channel = MethodChannel('connect4all/signal');

  Future<SignalReading?> read() async {
    if (!Platform.isAndroid) return null;
    // READ_PHONE_STATE is declared in the manifest, but on API 23+ that's
    // not enough by itself — it's a dangerous permission that also needs a
    // runtime grant, same as location. Without it, TelephonyManager's calls
    // on the native side throw SecurityException, the whole native read
    // fails, and every sample silently recorded networkType "none"
    // ("No signal") regardless of the phone's actual connection — this is
    // that fix. Onboarding also asks for it upfront now; this covers
    // already-onboarded installs and a first-run denial.
    if (!await Permission.phone.status.isGranted) {
      final status = await Permission.phone.request();
      if (!status.isGranted) return null;
    }
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>('read');
      if (result == null) return null;
      return SignalReading.fromMap(result);
    } on PlatformException {
      return null;
    }
  }
}
