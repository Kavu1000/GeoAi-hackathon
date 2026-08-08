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
  ReportCategory _category = ReportCategory.slow;
  final _operatorController = TextEditingController();
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _operatorController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  String _categoryLabel(AppLocalizations t, ReportCategory c) => switch (c) {
        ReportCategory.noSignal => t.reportCategoryNoSignal,
        ReportCategory.slow => t.reportCategorySlow,
        ReportCategory.outage => t.reportCategoryOutage,
      };

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final state = ref.watch(reportControllerProvider);

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
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.reportPrompt),
            const SizedBox(height: 8),
            ...ReportCategory.values.map(
              (c) => RadioListTile<ReportCategory>(
                title: Text(_categoryLabel(t, c)),
                value: c,
                groupValue: _category,
                onChanged: (v) => setState(() => _category = v!),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _operatorController,
              decoration: InputDecoration(labelText: t.reportOperatorLabel),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              maxLength: 500,
              maxLines: 3,
              decoration: InputDecoration(labelText: t.reportCommentLabel),
            ),
            const SizedBox(height: 16),
            if (state.status == ReportSubmitStatus.error)
              Text(t.reportError(state.error ?? ''), style: const TextStyle(color: Colors.redAccent)),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: state.status == ReportSubmitStatus.submitting
                    ? null
                    : () => ref.read(reportControllerProvider.notifier).submit(
                          category: _category,
                          operator: _operatorController.text,
                          comment: _commentController.text,
                        ),
                child: state.status == ReportSubmitStatus.submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(t.reportSubmit),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
