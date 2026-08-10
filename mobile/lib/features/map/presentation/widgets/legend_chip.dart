import 'package:flutter/material.dart';
import '../../../../app/theme/coverage_colors.dart';
import '../../../../l10n/generated/app_localizations.dart';

class LegendChip extends StatelessWidget {
  const LegendChip({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final tiers = <String, String>{
      'none': t.legendNoSignal,
      '2g': t.legend2g,
      '3g': t.legend3g,
      '4g': t.legend4g,
      '4g_plus': t.legend4gPlus,
      '5g': t.legend5g,
    };
    // 7 items (6 network tiers + predicted) don't fit one row on a phone
    // screen the way the old 4-item chip did — Wrap flows them onto as many
    // rows as the available width needs, so everything stays visible
    // without a scroll gesture the user has to discover.
    return Container(
      constraints: const BoxConstraints(maxWidth: 260),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (final entry in tiers.entries)
            _LegendEntry(color: CoverageColors.forStatus(entry.key), label: entry.value),
          _LegendEntry(outlined: true, label: t.legendPredicted),
        ],
      ),
    );
  }
}

class _LegendEntry extends StatelessWidget {
  final Color? color;
  final bool outlined;
  final String label;
  const _LegendEntry({this.color, this.outlined = false, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _Dot(color: color, outlined: outlined),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  final Color? color;
  final bool outlined;
  const _Dot({this.color, this.outlined = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : color,
        shape: BoxShape.circle,
        border: outlined ? Border.all(color: Colors.white70, width: 1.2) : null,
      ),
    );
  }
}
