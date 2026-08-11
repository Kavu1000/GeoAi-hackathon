import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/realtime/socket_provider.dart';
import '../data/cells_api.dart';
import '../domain/coverage_cell.dart';
import '../domain/laos_operator.dart';

final cellsApiProvider = Provider((ref) => CellsApi(ref.read(dioProvider)));

// Selected carrier filter — defaults to the first operator, matching the
// web apps' operator select (there's no "All operators" option there
// either, see client/dashboard's MapControls).
final selectedOperatorProvider = StateProvider<String>((ref) => laosOperators.first.value);

final visibleCellsProvider =
    AsyncNotifierProvider<MapController, List<CoverageCell>>(MapController.new);

class MapController extends AsyncNotifier<List<CoverageCell>> {
  Bbox? _lastBbox;

  @override
  Future<List<CoverageCell>> build() async {
    // Live updates: patch just the one changed hex in place instead of
    // refetching the whole bbox. Registered here (not loadBbox) so it's
    // wired up for the map's whole lifetime, mirroring RecordController's
    // Timer + ref.onDispose lifecycle pattern for a long-lived resource.
    final socket = ref.read(socketProvider);
    socket.on('hex-updated', _onHexUpdated);
    ref.onDispose(() => socket.off('hex-updated', _onHexUpdated));

    // Re-fetch the current view whenever the operator filter changes —
    // mirrors the web apps' useCells(bbox, operator) reactivity, where
    // changing the operator select refetches without moving the camera.
    ref.listen(selectedOperatorProvider, (_, __) {
      final bbox = _lastBbox;
      if (bbox != null) unawaited(loadBbox(bbox));
    });

    return [];
  }

  Future<void> loadBbox(Bbox bbox) async {
    _lastBbox = bbox;
    state = const AsyncValue.loading();
    final operator = ref.read(selectedOperatorProvider);
    state = await AsyncValue.guard(() => ref.read(cellsApiProvider).fetchInBbox(bbox, operator: operator));
  }

  void _onHexUpdated(dynamic data) {
    final feature = Map<String, dynamic>.from(data as Map);
    final cell = CoverageCell.fromFeature(feature);
    final current = List<CoverageCell>.from(state.value ?? const []);
    final idx = current.indexWhere((c) => c.h3 == cell.h3);
    if (idx == -1) {
      current.add(cell);
    } else {
      current[idx] = cell;
    }
    state = AsyncValue.data(current);
  }
}
