import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../../app/router/routes.dart';
import '../../../l10n/generated/app_localizations.dart';
import 'record_controller.dart';

class RecordScreen extends ConsumerWidget {
  const RecordScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context)!;
    final state = ref.watch(recordControllerProvider);
    final controller = ref.read(recordControllerProvider.notifier);
    final recording = state.status == RecordStatus.recording;

    return Scaffold(
      appBar: AppBar(
        title: Text(t.recordTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.map_outlined),
            tooltip: t.recordViewMap,
            onPressed: () => context.push(Routes.map),
          ),
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push(Routes.settings)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshStats,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(t.recordSubtitle, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),
            if (state.error != null)
              _ErrorBanner(message: state.error!, showOpenSettings: state.locationServiceDisabled),
            _StatusCard(state: state, recording: recording, onToggle: () => recording ? controller.stop() : controller.start()),
            const SizedBox(height: 16),
            _WaitingCard(state: state, onTryUploadNow: controller.tryUploadNow),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  final bool showOpenSettings;
  const _ErrorBanner({required this.message, this.showOpenSettings = false});

  @override
  Widget build(BuildContext context) {
    final onError = Theme.of(context).colorScheme.onErrorContainer;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: TextStyle(color: onError)),
          if (showOpenSettings) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                style: TextButton.styleFrom(foregroundColor: onError, padding: EdgeInsets.zero),
                onPressed: () => Geolocator.openLocationSettings(),
                child: const Text('Open location settings'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  final RecordState state;
  final bool recording;
  final VoidCallback onToggle;
  const _StatusCard({required this.state, required this.recording, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.recordStatusLabel.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(
              recording ? t.recordStatusRecording : t.recordStatusReady,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(t.recordModeLabel.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text(
              state.online ? t.recordModeOnline : t.recordModeOffline,
              style: TextStyle(color: state.online ? Colors.green.shade700 : Colors.orange.shade800),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: recording ? null : Theme.of(context).colorScheme.error,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: onToggle,
                child: Text(recording ? t.recordStop : t.recordStart, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WaitingCard extends StatelessWidget {
  final RecordState state;
  final VoidCallback onTryUploadNow;
  const _WaitingCard({required this.state, required this.onTryUploadNow});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.recordWaitingToSend.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            Text('${state.waitingCount}', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(t.recordWaitingNote, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: _Stat(label: t.recordSent, value: '${state.sentCount}', color: Colors.green.shade700)),
                Expanded(child: _Stat(label: t.recordRejected, value: '${state.rejectedCount}')),
                Expanded(
                  child: _Stat(
                    label: t.recordOldestWaiting,
                    value: state.oldestWaiting == null ? t.recordNone : _relative(state.oldestWaiting!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(t.recordLastUpload.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 2),
            Text(state.lastUploadAt == null ? t.recordNone : state.lastUploadAt!.toLocal().toString()),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(onPressed: onTryUploadNow, child: Text(t.recordTryUploadNow)),
            ),
          ],
        ),
      ),
    );
  }

  static String _relative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _Stat({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 2),
        Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
