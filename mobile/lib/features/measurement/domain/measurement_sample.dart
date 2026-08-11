class MeasurementSample {
  final double lat;
  final double lng;
  final String? operator;
  final String networkType;
  final int? signalDbm;
  final int? latencyMs;
  final double? downloadKbps;
  final double? uploadKbps;
  final String source; // "auto" | "speedtest" | "recording"
  final DateTime recordedAt;

  const MeasurementSample({
    required this.lat,
    required this.lng,
    this.operator,
    required this.networkType,
    this.signalDbm,
    this.latencyMs,
    this.downloadKbps,
    this.uploadKbps,
    required this.source,
    required this.recordedAt,
  });

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        if (operator != null) 'operator': operator,
        'networkType': networkType,
        if (signalDbm != null) 'signalDbm': signalDbm,
        if (latencyMs != null) 'latencyMs': latencyMs,
        if (downloadKbps != null) 'downloadKbps': downloadKbps,
        if (uploadKbps != null) 'uploadKbps': uploadKbps,
        'source': source,
        'recordedAt': recordedAt.toUtc().toIso8601String(),
      };
}
