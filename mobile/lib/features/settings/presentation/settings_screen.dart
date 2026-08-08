import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/isar_service.dart';
import '../../../core/storage/prefs.dart';
import '../../../core/sync/background_task.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late bool _backgroundSampling;

  @override
  void initState() {
    super.initState();
    final prefs = ref.read(sharedPreferencesProvider);
    _backgroundSampling = prefs.getBool(PrefsKeys.backgroundSamplingEnabled) ?? true;
  }

  Future<void> _onToggle(bool v) async {
    setState(() => _backgroundSampling = v);
    await ref.read(sharedPreferencesProvider).setBool(PrefsKeys.backgroundSamplingEnabled, v);
    v ? await BackgroundSync.enable() : await BackgroundSync.disable();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          SwitchListTile(
            title: const Text('Background sampling'),
            subtitle: const Text('Periodically measure signal in the background to help map coverage'),
            value: _backgroundSampling,
            onChanged: _onToggle,
          ),
          const Divider(),
          ListTile(
            title: const Text('Delete my data'),
            subtitle: const Text('Removes any pending unsynced samples and reports from this device'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _confirmDelete(context),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete local data?'),
        content: const Text('This clears anything queued on this device that has not yet uploaded.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final isar = IsarService.instance;
              await isar.writeTxn(() => isar.outboxItems.clear());
              if (ctx.mounted) Navigator.pop(ctx);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Local data cleared.')),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
