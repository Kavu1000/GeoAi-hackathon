import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/isar_service.dart';
import '../../../core/storage/outbox_item.dart'; // for the isar.outboxItems collection extension
import '../../../core/storage/prefs.dart';
import '../../../core/sync/background_task.dart';
import '../../../l10n/generated/app_localizations.dart';

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
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(t.settingsTitle)),
      body: ListView(
        children: [
          SwitchListTile(
            title: Text(t.settingsBackgroundSamplingTitle),
            subtitle: Text(t.settingsBackgroundSamplingSubtitle),
            value: _backgroundSampling,
            onChanged: _onToggle,
          ),
          const Divider(),
          ListTile(
            title: Text(t.settingsDeleteDataTitle),
            subtitle: Text(t.settingsDeleteDataSubtitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _confirmDelete(context, t),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, AppLocalizations t) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t.settingsDeleteDialogTitle),
        content: Text(t.settingsDeleteDialogBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t.settingsCancel)),
          TextButton(
            onPressed: () async {
              final isar = IsarService.instance;
              await isar.writeTxn(() => isar.outboxItems.clear());
              if (ctx.mounted) Navigator.pop(ctx);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(t.settingsDataCleared)),
                );
              }
            },
            child: Text(t.settingsDelete),
          ),
        ],
      ),
    );
  }
}
