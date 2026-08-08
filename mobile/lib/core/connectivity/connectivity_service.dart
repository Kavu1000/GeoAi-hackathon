import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService(Connectivity());
});

final isOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onStatusChange;
});

class ConnectivityService {
  final Connectivity _connectivity;
  const ConnectivityService(this._connectivity);

  Future<bool> hasInternet() async {
    final results = await _connectivity.checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  Stream<bool> get onStatusChange =>
      _connectivity.onConnectivityChanged.map((results) => !results.contains(ConnectivityResult.none));
}
