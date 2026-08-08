import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';

/// Offline base-map tile cache — the MAP step's "cached for offline use".
/// Tiles the device has already downloaded keep rendering with no
/// connection; tiles it hasn't seen yet fall back to the live network (and
/// get cached once fetched) whenever signal is available.
///
/// Verified against flutter_map_tile_caching 9.1.4 + flutter_map 7.0.2 via
/// `flutter analyze` (see mobile/README.md for toolchain notes).
class TileCache {
  TileCache._();

  static const _store = FMTCStore('osmStore');

  /// Call once during bootstrap, before the first map screen builds.
  static Future<void> init() async {
    await FMTCObjectBoxBackend().initialise();
    if (!await _store.manage.ready) {
      await _store.manage.create();
    }
  }

  static FMTCTileProvider tileProvider() => _store.getTileProvider();
}
