import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportControllerProvider);

    ref.listen(reportControllerProvider, (prev, next) {
      if (next.status == ReportSubmitStatus.done) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report saved. Thank you.')),
        );
        context.pop();
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Report a problem')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('What are you experiencing?'),
            const SizedBox(height: 8),
            ...ReportCategory.values.map(
              (c) => RadioListTile<ReportCategory>(
                title: Text(c.label),
                value: c,
                groupValue: _category,
                onChanged: (v) => setState(() => _category = v!),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _operatorController,
              decoration: const InputDecoration(labelText: 'Operator (optional)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentController,
              maxLength: 500,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Comment (optional)'),
            ),
            const SizedBox(height: 16),
            if (state.status == ReportSubmitStatus.error)
              Text('Could not save: ${state.error}', style: const TextStyle(color: Colors.redAccent)),
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
                    : const Text('Submit'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
