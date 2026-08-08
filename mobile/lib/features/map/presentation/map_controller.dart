import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../data/cells_api.dart';
import '../domain/coverage_cell.dart';

final cellsApiProvider = Provider((ref) => CellsApi(ref.read(dioProvider)));

final visibleCellsProvider =
    AsyncNotifierProvider<MapController, List<CoverageCell>>(MapController.new);

class MapController extends AsyncNotifier<List<CoverageCell>> {
  @override
  Future<List<CoverageCell>> build() async => [];

  Future<void> loadBbox(Bbox bbox) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => ref.read(cellsApiProvider).fetchInBbox(bbox));
  }
}
