import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../../../core/storage/secure_storage.dart';
import 'auth_api.dart';

class AuthRepository {
  final Dio dio;
  final SecureStorageService secureStorage;

  AuthRepository({required this.dio, required this.secureStorage});

  /// Ensures the device has a session. The mobile app is anonymous by
  /// default — a generated device id is enough to submit measurements and
  /// reports; there's no account creation flow for residents/travellers.
  Future<void> ensureSession() async {
    final existingToken = await secureStorage.readAccessToken();
    if (existingToken != null) return;

    var deviceId = await secureStorage.readDeviceId();
    if (deviceId == null) {
      deviceId = const Uuid().v4();
      await secureStorage.writeDeviceId(deviceId);
    }

    final data = await AuthApi.registerDevice(dio, deviceId: deviceId);
    await secureStorage.writeAccessToken(data['accessToken'] as String);
    await secureStorage.writeRefreshToken(data['refreshToken'] as String);
  }
}
