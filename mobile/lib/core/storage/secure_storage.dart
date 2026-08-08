import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService(const FlutterSecureStorage());
});

class SecureStorageService {
  final FlutterSecureStorage _storage;
  const SecureStorageService(this._storage);

  static const _accessTokenKey = "access_token";
  static const _refreshTokenKey = "refresh_token";
  static const _deviceIdKey = "device_id";

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);
  Future<void> writeAccessToken(String token) => _storage.write(key: _accessTokenKey, value: token);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);
  Future<void> writeRefreshToken(String token) => _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> readDeviceId() => _storage.read(key: _deviceIdKey);
  Future<void> writeDeviceId(String id) => _storage.write(key: _deviceIdKey, value: id);

  Future<void> clearSession() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
