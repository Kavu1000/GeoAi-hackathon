// Laos's mobile network operators, for the Coverage Map's carrier filter.
// Matches `operatorStats.operator` / `Report.operator` — free-text fields
// filled in from whatever a device or report actually says, so this list is
// a filter convenience, not an enforced enum on the backend.
export interface Operator {
  value: string;
  label: string;
}

export const LAOS_OPERATORS: Operator[] = [
  { value: "Unitel", label: "Unitel Mobile" },
  { value: "ETL", label: "ETL Mobile" },
  // Matches mobile's MobileOperator.laoTelecom wireValue exactly (see
  // mobile/lib/features/report/domain/report_payload.dart) — the actual
  // third Laos operator the app reports against, not "Tplus".
  { value: "Lao Telecom", label: "Lao Telecom" },
];
