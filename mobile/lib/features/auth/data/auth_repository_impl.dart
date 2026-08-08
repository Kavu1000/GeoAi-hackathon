import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../../../core/storage/secure_storage.dart';

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

    final res = await dio.post('/auth/device', data: {'deviceId': deviceId, 'locale': 'lo'});
    await secureStorage.writeAccessToken(res.data['accessToken'] as String);
    await secureStorage.writeRefreshToken(res.data['refreshToken'] as String);
  }
}
