class SignalReading {
  final int? dbm;
  final String networkType; // "2g" | "3g" | "4g" | "5g" | "wifi" | "none"
  final String? operatorName;

  const SignalReading({required this.dbm, required this.networkType, this.operatorName});

  factory SignalReading.fromMap(Map<String, dynamic> map) => SignalReading(
        dbm: map['dbm'] as int?,
        networkType: map['networkType'] as String? ?? 'none',
        operatorName: map['operatorName'] as String?,
      );
}
