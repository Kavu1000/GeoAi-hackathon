enum ReportCategory { noSignal, slow, outage }

extension ReportCategoryJson on ReportCategory {
  String get wireValue => switch (this) {
        ReportCategory.noSignal => 'no_signal',
        ReportCategory.slow => 'slow',
        ReportCategory.outage => 'outage',
      };

  String get label => switch (this) {
        ReportCategory.noSignal => 'No signal',
        ReportCategory.slow => 'Slow internet',
        ReportCategory.outage => 'Outage',
      };
}

class ReportPayload {
  final double lat;
  final double lng;
  final ReportCategory category;
  final String? operator;
  final String? comment;

  const ReportPayload({
    required this.lat,
    required this.lng,
    required this.category,
    this.operator,
    this.comment,
  });

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'category': category.wireValue,
        if (operator != null && operator!.isNotEmpty) 'operator': operator,
        if (comment != null && comment!.isNotEmpty) 'comment': comment,
      };
}
