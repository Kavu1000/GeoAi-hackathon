import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/laos_operator.dart';
import '../../domain/laos_province.dart';
import '../map_controller.dart' show selectedOperatorProvider;

// Dark rounded chip, mirrors LegendChip's styling. Mirrors client/dashboard's
// MapControls (province select, operator select, basemap toggle) — same
// "__all__" sentinel for the province select's "All Laos" option as the web
// version, so the two behave identically, not just visually.
class MapControlsBar extends ConsumerWidget {
  final String? focusedProvince; // null = All Laos
  final ValueChanged<LaosProvince?> onProvinceChange;
  final bool satellite;
  final VoidCallback onBasemapToggle;

  const MapControlsBar({
    super.key,
    required this.focusedProvince,
    required this.onProvinceChange,
    required this.satellite,
    required this.onBasemapToggle,
  });

  static const _dropdownTextStyle = TextStyle(color: Colors.white, fontSize: 13);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final operator = ref.watch(selectedOperatorProvider);

    return Container(
      constraints: const BoxConstraints(maxWidth: 220),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DropdownButton<String>(
            value: focusedProvince ?? '__all__',
            isExpanded: true,
            dropdownColor: Colors.black87,
            underline: const SizedBox(),
            style: _dropdownTextStyle,
            items: [
              const DropdownMenuItem(value: '__all__', child: Text('All Laos')),
              for (final p in laosProvinces) DropdownMenuItem(value: p.name, child: Text(p.name)),
            ],
            onChanged: (name) {
              if (name == null) return;
              onProvinceChange(name == '__all__' ? null : laosProvinces.firstWhere((p) => p.name == name));
            },
          ),
          DropdownButton<String>(
            value: operator,
            isExpanded: true,
            dropdownColor: Colors.black87,
            underline: const SizedBox(),
            style: _dropdownTextStyle,
            items: [for (final o in laosOperators) DropdownMenuItem(value: o.value, child: Text(o.label))],
            onChanged: (value) {
              if (value != null) ref.read(selectedOperatorProvider.notifier).state = value;
            },
          ),
          InkWell(
            onTap: onBasemapToggle,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(satellite ? Icons.satellite_alt_outlined : Icons.map_outlined, color: Colors.white, size: 16),
                  const SizedBox(width: 6),
                  Text(satellite ? 'Satellite' : 'Streets', style: _dropdownTextStyle),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
