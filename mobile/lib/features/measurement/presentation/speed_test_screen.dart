import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'speed_test_controller.dart';

class SpeedTestScreen extends ConsumerWidget {
  const SpeedTestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(speedTestControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Speed test')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _statusView(state),
              const SizedBox(height: 32),
              if (state.status != SpeedTestStatus.measuringSignal && state.status != SpeedTestStatus.testingSpeed)
                ElevatedButton(
                  onPressed: () => ref.read(speedTestControllerProvider.notifier).run(),
                  child: Text(state.status == SpeedTestStatus.idle ? 'Start test' : 'Test again'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusView(SpeedTestState state) {
    switch (state.status) {
      case SpeedTestStatus.idle:
        return const Text('Tap start to measure your connection at this location.');
      case SpeedTestStatus.measuringSignal:
        return const _Busy(label: 'Reading location & signal...');
      case SpeedTestStatus.testingSpeed:
        return const _Busy(label: 'Testing download speed...');
      case SpeedTestStatus.done:
        final r = state.result!;
        return Column(
          children: [
            Text('${r.downloadKbps.toStringAsFixed(0)} kbps', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Latency: ${r.latencyMs} ms'),
            const SizedBox(height: 16),
            const Text('Saved. Will upload automatically when a connection is available.', textAlign: TextAlign.center),
          ],
        );
      case SpeedTestStatus.error:
        return Text('Could not complete test: ${state.error}', textAlign: TextAlign.center);
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
