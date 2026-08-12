import 'package:flutter/services.dart';
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

  // Android's Keystore-backed cipher can leave an entry undecryptable after
  // e.g. a reinstall with a different signing key or an OS-level keystore
  // reset — reading it then throws a PlatformException wrapping
  // javax.crypto.BadPaddingException, not just "value not found". Every Dio
  // request reads the access token on every call (see dio_client.dart), so
  // an unhandled throw here broke everything through it: speed test, the
  // Record screen's drain, login. Treat "can't decrypt" the same as "not
  // set" and drop the poisoned entry so it doesn't fail the same way again.
  Future<String?> _readSafe(String key) async {
    try {
      return await _storage.read(key: key);
    } on PlatformException {
      await _storage.delete(key: key);
      return null;
    }
  }

  Future<String?> readAccessToken() => _readSafe(_accessTokenKey);
  Future<void> writeAccessToken(String token) => _storage.write(key: _accessTokenKey, value: token);

  Future<String?> readRefreshToken() => _readSafe(_refreshTokenKey);
  Future<void> writeRefreshToken(String token) => _storage.write(key: _refreshTokenKey, value: token);

  Future<String?> readDeviceId() => _readSafe(_deviceIdKey);
  Future<void> writeDeviceId(String id) => _storage.write(key: _deviceIdKey, value: id);

  Future<void> clearSession() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
