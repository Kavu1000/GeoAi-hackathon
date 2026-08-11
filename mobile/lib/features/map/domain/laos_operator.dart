// Laos's mobile network operators, for the map's carrier filter. Mirrors
// client/src/data/operators.ts and dashboard/src/data/operators.ts exactly
// — "Lao Telecom" (not "Tplus") matches
// features/report/domain/report_payload.dart's MobileOperator.laoTelecom
// wireValue, the real third Laos operator this app reports against.
class LaosOperator {
  final String value;
  final String label;

  const LaosOperator({required this.value, required this.label});
}

const laosOperators = <LaosOperator>[
  LaosOperator(value: "Unitel", label: "Unitel Mobile"),
  LaosOperator(value: "ETL", label: "ETL Mobile"),
  LaosOperator(value: "Lao Telecom", label: "Lao Telecom"),
];
