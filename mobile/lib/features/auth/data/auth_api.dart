import 'package:dio/dio.dart';

/// Free functions wrapping the two unauthenticated `/auth/*` calls — used by
/// both AuthRepository.ensureSession() (first launch) and dio_client.dart's
/// 401 retry interceptor (a dead/expired session found mid-app-lifetime).
/// Kept free of any Riverpod/provider wiring and taking a plain [Dio]
/// deliberately: dio_client.dart's interceptor lives *on* the app's shared
/// Dio instance, so it can't route its own re-auth calls through that same
/// instance without recursing back into itself.
class AuthApi {
  AuthApi._();

  static Future<Map<String, dynamic>> registerDevice(Dio dio, {required String deviceId}) async {
    final res = await dio.post('/auth/device', data: {'deviceId': deviceId, 'locale': 'lo'});
    return res.data as Map<String, dynamic>;
  }

  /// Returns the new access token, or null if the refresh token itself is
  /// gone/expired/invalid (a JWT_REFRESH_TTL of 30d means this is rare, but
  /// not impossible — a device sitting unused for a month, or a token
  /// issued against a since-rotated JWT_REFRESH_SECRET).
  static Future<String?> refresh(Dio dio, {required String refreshToken}) async {
    try {
      final res = await dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
      return res.data['accessToken'] as String;
    } on DioException {
      return null;
    }
  }
}
