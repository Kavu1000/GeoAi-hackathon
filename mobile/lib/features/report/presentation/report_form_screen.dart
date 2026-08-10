import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/report_payload.dart';
import 'report_controller.dart';

class ReportFormScreen extends ConsumerStatefulWidget {
  const ReportFormScreen({super.key});

  @override
  ConsumerState<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends ConsumerState<ReportFormScreen> {
  SignalType _signalType = SignalType.g4;
  MobileOperator? _operator;
  String? _province;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final state = ref.watch(reportControllerProvider);
    final theme = Theme.of(context);

    ref.listen(reportControllerProvider, (prev, next) {
      if (next.status == ReportSubmitStatus.done) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t.reportSaved)),
        );
        context.pop();
      }
    });

    return Scaffold(
      appBar: AppBar(title: Text(t.reportTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ──────── Header ────────
            Text(
              t.reportPrompt,
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),

            // ──────── Signal Type Dropdown ────────
            _buildLabel(context, t.reportSignalTypeLabel),
            const SizedBox(height: 6),
            _buildDropdown<SignalType>(
              context: context,
              value: _signalType,
              items: SignalType.values,
              itemLabel: (v) => v.label,
              onChanged: (v) => setState(() => _signalType = v!),
            ),
            const SizedBox(height: 20),

            // ──────── Operator Dropdown ────────
            _buildLabel(context, t.reportOperatorLabel),
            const SizedBox(height: 6),
            _buildDropdown<MobileOperator?>(
              context: context,
              value: _operator,
              items: [null, ...MobileOperator.values],
              itemLabel: (v) =>
                  v == null ? t.reportSelectOperatorHint : v.label,
              onChanged: (v) => setState(() => _operator = v),
            ),
            const SizedBox(height: 20),

            // ──────── Province Dropdown ────────
            _buildLabel(context, t.reportProvinceLabel),
            const SizedBox(height: 6),
            _buildDropdown<String?>(
              context: context,
              value: _province,
              items: [null, ...kLaoProvinces],
              itemLabel: (v) => v ?? t.reportSelectProvinceHint,
              onChanged: (v) => setState(() => _province = v),
            ),
            const SizedBox(height: 20),

            // ──────── Comment (optional) ────────
            _buildLabel(context, t.reportCommentLabel),
            const SizedBox(height: 6),
            TextField(
              controller: _commentController,
              maxLength: 300,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: t.reportCommentHint,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 16),

            // ──────── Error message ────────
            if (state.status == ReportSubmitStatus.error)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  t.reportError(state.error ?? ''),
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),

            // ──────── Submit button ────────
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: state.status == ReportSubmitStatus.submitting
                    ? null
                    : () => ref
                        .read(reportControllerProvider.notifier)
                        .submit(
                          signalType: _signalType,
                          operator: _operator,
                          province: _province,
                          comment: _commentController.text,
                        ),
                child: state.status == ReportSubmitStatus.submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5))
                    : Text(t.reportSubmit,
                        style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────

  Widget _buildLabel(BuildContext context, String text) => Text(
        text,
        style: Theme.of(context)
            .textTheme
            .bodyMedium
            ?.copyWith(fontWeight: FontWeight.w600),
      );

  Widget _buildDropdown<T>({
    required BuildContext context,
    required T value,
    required List<T> items,
    required String Function(T) itemLabel,
    required ValueChanged<T?> onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(
            color: Theme.of(context).dividerColor),
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          borderRadius: BorderRadius.circular(12),
          items: items
              .map((e) => DropdownMenuItem<T>(
                    value: e,
                    child: Text(itemLabel(e)),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
