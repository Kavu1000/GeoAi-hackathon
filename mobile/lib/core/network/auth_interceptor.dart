import 'package:dio/dio.dart';
import '../../features/auth/data/auth_api.dart';
import '../storage/secure_storage.dart';

/// Transparent 401 → refresh-and-retry, shared by the app's main Dio
/// (dio_client.dart) and the WorkManager background isolate's own Dio
/// (background_task.dart, which can't reach the app's Riverpod container
/// and so builds everything from scratch).
///
/// Exists because access tokens are short-lived (JWT_ACCESS_TTL=15m
/// server-side) and, before this, nothing ever renewed them — every authed
/// request started failing with 401 fifteen minutes into any session and
/// never recovered, since SyncEngine treats any 4xx as a permanent
/// rejection and deletes the queued data for good. This refreshes and
/// retries once instead of ever surfacing the 401 to callers.
Interceptor buildAuthRetryInterceptor({
  required Dio dio,
  required SecureStorageService secureStorage,
}) {
  // A separate, interceptor-free Dio for the re-auth calls below — routing
  // them through `dio` itself would recurse back into this interceptor.
  final authDio = Dio(BaseOptions(baseUrl: dio.options.baseUrl));

  return InterceptorsWrapper(
    onError: (error, handler) async {
      final status = error.response?.statusCode;
      final req = error.requestOptions;
      if (status != 401 || req.extra['retriedAfter401'] == true) {
        return handler.next(error);
      }
      req.extra['retriedAfter401'] = true;

      final refreshToken = await secureStorage.readRefreshToken();
      String? newAccessToken;
      if (refreshToken != null) {
        newAccessToken = await AuthApi.refresh(authDio, refreshToken: refreshToken);
      }
      if (newAccessToken == null) {
        // Refresh token is also gone/expired (rare — it lives 30 days) —
        // mint a brand new anonymous session under the same device id
        // rather than leaving this Dio stuck re-failing every request for
        // the rest of its life.
        final deviceId = await secureStorage.readDeviceId();
        if (deviceId != null) {
          try {
            final data = await AuthApi.registerDevice(authDio, deviceId: deviceId);
            newAccessToken = data['accessToken'] as String;
            await secureStorage.writeRefreshToken(data['refreshToken'] as String);
          } on DioException {
            newAccessToken = null;
          }
        }
      }
      if (newAccessToken == null) {
        return handler.next(error); // unrecoverable (e.g. offline) — surface the original error
      }
      await secureStorage.writeAccessToken(newAccessToken);
      try {
        final response = await dio.fetch(req);
        return handler.resolve(response);
      } on DioException catch (retryError) {
        return handler.next(retryError);
      }
    },
  );
}
