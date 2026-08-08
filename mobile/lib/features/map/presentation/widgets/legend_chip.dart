import 'package:flutter/material.dart';
import '../../../../app/theme/coverage_colors.dart';

class LegendChip extends StatelessWidget {
  const LegendChip({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.65),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          _Dot(color: CoverageColors.green),
          SizedBox(width: 4),
          Text('Good', style: TextStyle(color: Colors.white, fontSize: 12)),
          SizedBox(width: 10),
          _Dot(color: CoverageColors.yellow),
          SizedBox(width: 4),
          Text('Slow', style: TextStyle(color: Colors.white, fontSize: 12)),
          SizedBox(width: 10),
          _Dot(color: CoverageColors.red),
          SizedBox(width: 4),
          Text('None', style: TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final Color color;
  const _Dot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
  }
}
