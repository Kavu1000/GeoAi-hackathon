import 'package:dio/dio.dart';
import '../domain/coverage_cell.dart';

class CellsApi {
  final Dio dio;
  const CellsApi(this.dio);

  Future<List<CoverageCell>> fetchInBbox(Bbox bbox, {String? operator}) async {
    final res = await dio.get('/cells', queryParameters: {
      'minLng': bbox.minLng,
      'minLat': bbox.minLat,
      'maxLng': bbox.maxLng,
      'maxLat': bbox.maxLat,
      if (operator != null) 'operator': operator,
    });
    final features = (res.data['features'] as List).cast<Map<String, dynamic>>();
    return features.map(CoverageCell.fromFeature).toList();
  }
}
