import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../l10n/generated/app_localizations.dart';
import 'speed_test_controller.dart';

class SpeedTestScreen extends ConsumerWidget {
  const SpeedTestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context)!;
    final state = ref.watch(speedTestControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t.speedTestTitle)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _statusView(t, state),
              const SizedBox(height: 32),
              if (state.status != SpeedTestStatus.measuringSignal && state.status != SpeedTestStatus.testingSpeed)
                ElevatedButton(
                  onPressed: () => ref.read(speedTestControllerProvider.notifier).run(),
                  child: Text(state.status == SpeedTestStatus.idle ? t.speedTestStart : t.speedTestAgain),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusView(AppLocalizations t, SpeedTestState state) {
    switch (state.status) {
      case SpeedTestStatus.idle:
        return Text(t.speedTestIdle);
      case SpeedTestStatus.measuringSignal:
        return _Busy(label: t.speedTestReading);
      case SpeedTestStatus.testingSpeed:
        return _Busy(label: t.speedTestTesting);
      case SpeedTestStatus.done:
        final r = state.result!;
        return Column(
          children: [
            Text('${r.downloadKbps.toStringAsFixed(0)} kbps', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(t.speedTestLatency(r.latencyMs)),
            const SizedBox(height: 16),
            Text(t.speedTestSavedNote, textAlign: TextAlign.center),
          ],
        );
      case SpeedTestStatus.error:
        return Text(t.speedTestError(state.error ?? ''), textAlign: TextAlign.center);
    }
  }
}

class _Busy extends StatelessWidget {
  final String label;
  const _Busy({required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const CircularProgressIndicator(),
        const SizedBox(height: 16),
        Text(label),
      ],
    );
  }
}
