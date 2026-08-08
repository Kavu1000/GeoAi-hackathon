import 'package:flutter/material.dart';
import '../../../../app/theme/coverage_colors.dart';
import '../../../../l10n/generated/app_localizations.dart';

class LegendChip extends StatelessWidget {
  const LegendChip({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _Dot(color: CoverageColors.green),
          const SizedBox(width: 4),
          Text(t.legendStrong, style: const TextStyle(color: Colors.white, fontSize: 12)),
          const SizedBox(width: 10),
          const _Dot(color: CoverageColors.yellow),
          const SizedBox(width: 4),
          Text(t.legendWeak, style: const TextStyle(color: Colors.white, fontSize: 12)),
          const SizedBox(width: 10),
          const _Dot(color: CoverageColors.red),
          const SizedBox(width: 4),
          Text(t.legendNoSignal, style: const TextStyle(color: Colors.white, fontSize: 12)),
          const SizedBox(width: 10),
          const _Dot(outlined: true),
          const SizedBox(width: 4),
          Text(t.legendPredicted, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
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
