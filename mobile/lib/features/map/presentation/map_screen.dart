import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../app/router/routes.dart';
import '../../../app/theme/coverage_colors.dart';
import '../domain/coverage_cell.dart';
import 'map_controller.dart';
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
    final cellsAsync = ref.watch(visibleCellsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Coverage Map'),
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
                userAgentPackageName: 'com.laocoverage.app',
              ),
              PolygonLayer(
                polygons: cellsAsync.value?.map(_toPolygon).toList() ?? const [],
              ),
            ],
          ),
          const Positioned(top: 12, right: 12, child: LegendChip()),
          if (cellsAsync.isLoading)
            const Positioned(top: 12, left: 12, child: CircularProgressIndicator(strokeWidth: 2)),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'report',
            onPressed: () => context.push(Routes.report),
            icon: const Icon(Icons.flag_outlined),
            label: const Text('Report'),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'speedtest',
            onPressed: () => context.push(Routes.speedTest),
            icon: const Icon(Icons.speed_outlined),
            label: const Text('Speed test'),
          ),
        ],
      ),
    );
  }

  Polygon _toPolygon(CoverageCell cell) {
    return Polygon(
      points: cell.polygon,
      color: CoverageColors.forStatus(cell.status).withOpacity(0.45),
      borderColor: Colors.white24,
      borderStrokeWidth: 1,
    );
  }
}
