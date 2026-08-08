import 'package:latlong2/latlong.dart';

class CoverageCell {
  final String h3;
  final String status; // green | yellow | red
  final double avgDownloadKbps;
  final int sampleCount;
  final int reportCount;
  final List<LatLng> polygon;

  const CoverageCell({
    required this.h3,
    required this.status,
    required this.avgDownloadKbps,
    required this.sampleCount,
    required this.reportCount,
    required this.polygon,
  });

  factory CoverageCell.fromFeature(Map<String, dynamic> feature) {
    final props = feature['properties'] as Map<String, dynamic>;
    final coords = (feature['geometry']['coordinates'] as List)[0] as List;
    return CoverageCell(
      h3: props['h3'] as String,
      status: props['status'] as String,
      avgDownloadKbps: (props['avgDownloadKbps'] as num).toDouble(),
      sampleCount: props['sampleCount'] as int,
      reportCount: props['reportCount'] as int,
      polygon: coords
          .map((c) => LatLng(((c as List)[1] as num).toDouble(), (c[0] as num).toDouble()))
          .toList(),
    );
  }
}

class Bbox {
  final double minLng, minLat, maxLng, maxLat;
  const Bbox({required this.minLng, required this.minLat, required this.maxLng, required this.maxLat});
}
