// Signal quality levels that a user can report
enum SignalType { noSignal, g2, g3, g4, g4Plus, g5 }

extension SignalTypeX on SignalType {
  String get wireValue => switch (this) {
        SignalType.noSignal => 'no_signal',
        SignalType.g2 => '2G',
        SignalType.g3 => '3G',
        SignalType.g4 => '4G',
        SignalType.g4Plus => '4G+',
        SignalType.g5 => '5G',
      };

  String get label => switch (this) {
        SignalType.noSignal => 'No signal',
        SignalType.g2 => '2G',
        SignalType.g3 => '3G',
        SignalType.g4 => '4G',
        SignalType.g4Plus => '4G+',
        SignalType.g5 => '5G',
      };
}

// Laos mobile operators
enum MobileOperator { unitel, etl, laoTelecom, other }

extension MobileOperatorX on MobileOperator {
  String get wireValue => switch (this) {
        MobileOperator.unitel => 'Unitel',
        MobileOperator.etl => 'ETL',
        MobileOperator.laoTelecom => 'Lao Telecom',
        MobileOperator.other => 'Other',
      };

  String get label => wireValue;
}

// Lao provinces (ແຂວງ)
const List<String> kLaoProvinces = [
  'ວຽງຈັນ (ນະຄອນ)',
  'ວຽງຈັນ (ແຂວງ)',
  'ບໍລິຄຳໄຊ',
  'ຄຳມ່ວນ',
  'ສະຫວັນນະເຂດ',
  'ສາລະວັນ',
  'ເຊກອງ',
  'ຈຳປາສັກ',
  'ອັດຕະປື',
  'ຫຼວງພະບາງ',
  'ຫົວພັນ',
  'ຊຽງຂວາງ',
  'ຜົ້ງສາລີ',
  'ລວງນໍ້າທາ',
  'ບໍ່ແກ້ວ',
  'ອຸດົມໄຊ',
  'ໄຊຍະບູລີ',
  'ໄຊສົມບູນ',
];

class ReportPayload {
  final double lat;
  final double lng;
  final SignalType signalType;
  final MobileOperator? operator;
  final String? province;
  final String? comment;

  const ReportPayload({
    required this.lat,
    required this.lng,
    required this.signalType,
    this.operator,
    this.province,
    this.comment,
  });

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'signal_type': signalType.wireValue,
        if (operator != null) 'operator': operator!.wireValue,
        if (province != null && province!.isNotEmpty) 'province': province,
        if (comment != null && comment!.isNotEmpty) 'comment': comment,
      };
}
