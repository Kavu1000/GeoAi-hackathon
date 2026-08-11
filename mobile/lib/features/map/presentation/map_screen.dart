import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../app/router/routes.dart';
import '../../../app/theme/coverage_colors.dart';
import '../../../core/map/tile_cache.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/coverage_cell.dart';
// hide MapController: this file's own MapController (a Riverpod
// AsyncNotifier, see map_controller.dart) collides by name with
// flutter_map's MapController, which this screen also needs for the map
// widget itself. We only ever use `visibleCellsProvider` from this import.
import 'map_controller.dart' hide MapController;
import 'widgets/legend_chip.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final _mapController = MapController();
  Timer? _debounce;
  static const _initialCenter = LatLng(19.8856, 102.1347); // Luang Prabang

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadForCurrentView());
  }

  void _onMapEvent(MapEvent event) {
    if (event is MapEventMoveEnd || event is MapEventFlingAnimationEnd) {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 350), _loadForCurrentView);
    }
  }

  void _loadForCurrentView() {
    final bounds = _mapController.camera.visibleBounds;
    ref.read(visibleCellsProvider.notifier).loadBbox(Bbox(
          minLng: bounds.west,
          minLat: bounds.south,
          maxLng: bounds.east,
          maxLat: bounds.north,
        ));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final cellsAsync = ref.watch(visibleCellsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(t.mapTitle),
        actions: [
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push(Routes.settings)),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _initialCenter,
              initialZoom: 11,
              onMapEvent: _onMapEvent,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.connect4all.app',
                // Serves cached tiles offline (dead zones are the whole
                // point of this app) and caches new ones when online.
                tileProvider: TileCache.tileProvider(),
              ),
              PolygonLayer<Object>(
                polygons: cellsAsync.value?.map(_toPolygon).toList() ?? const [],
              ),
            ],
          ),
          const Positioned(top: 12, right: 12, child: LegendChip()),
          if (cellsAsync.isLoading)
            const Positioned(top: 12, left: 12, child: CircularProgressIndicator(strokeWidth: 2)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'speedtest',
        onPressed: () => context.push(Routes.speedTest),
        icon: const Icon(Icons.speed_outlined),
        label: Text(t.mapSpeedTestAction),
      ),
    );
  }

  Polygon<Object> _toPolygon(CoverageCell cell) {
    // Predicted (model-estimated) cells render lighter with a brighter,
    // thicker border so they read as "our best guess", not a measurement —
    // matches the "Predicted (model estimate)" legend entry. flutter_map's
    // base Polygon has no built-in dashed-stroke option, so this leans on
    // opacity/weight instead; swap in a real dashed StrokePattern if the
    // installed flutter_map version supports one.
    return Polygon<Object>(
      points: cell.polygon,
      color: CoverageColors.forStatus(cell.status).withValues(alpha: cell.predicted ? 0.22 : 0.45),
      borderColor: cell.predicted ? Colors.white54 : Colors.white24,
      borderStrokeWidth: cell.predicted ? 1.5 : 1,
    );
  }
}
