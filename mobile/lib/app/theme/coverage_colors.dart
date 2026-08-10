import 'package:flutter/material.dart';

/// Network-generation status colors — worst to best: none / 2G / 3G / 4G /
/// 4G+ / 5G. Validated (dataviz-skill palette checker) against this app's
/// dark surface (#0B1220) and the dashboard's white surface, so the same
/// hex values read correctly in both places. `none` is an intentionally
/// desaturated gray (the "off" state) — it fails the checker's chroma-floor
/// check on purpose and always ships with a text label, never color alone.
class CoverageColors {
  CoverageColors._();

  static const none = Color(0xFF71717A);
  static const twoG = Color(0xFF2563EB);
  static const threeG = Color(0xFF16A34A);
  static const fourG = Color(0xFFEA580C);
  static const fourGPlus = Color(0xFFBE123C);
  static const fiveG = Color(0xFF7C3AED);

  static const order = ['none', '2g', '3g', '4g', '4g_plus', '5g'];

  static Color forStatus(String status) {
    switch (status) {
      case '2g':
        return twoG;
      case '3g':
        return threeG;
      case '4g':
        return fourG;
      case '4g_plus':
        return fourGPlus;
      case '5g':
        return fiveG;
      case 'none':
      default:
        return none;
    }
  }
}
