import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/realtime/socket_provider.dart';
import '../data/cells_api.dart';
import '../domain/coverage_cell.dart';

final cellsApiProvider = Provider((ref) => CellsApi(ref.read(dioProvider)));

final visibleCellsProvider =
    AsyncNotifierProvider<MapController, List<CoverageCell>>(MapController.new);

class MapController extends AsyncNotifier<List<CoverageCell>> {
  @override
  Future<List<CoverageCell>> build() async {
    // Live updates: patch just the one changed hex in place instead of
    // refetching the whole bbox. Registered here (not loadBbox) so it's
    // wired up for the map's whole lifetime, mirroring RecordController's
    // Timer + ref.onDispose lifecycle pattern for a long-lived resource.
    final socket = ref.read(socketProvider);
    socket.on('hex-updated', _onHexUpdated);
    ref.onDispose(() => socket.off('hex-updated', _onHexUpdated));
    return [];
  }

  Future<void> loadBbox(Bbox bbox) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => ref.read(cellsApiProvider).fetchInBbox(bbox));
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
