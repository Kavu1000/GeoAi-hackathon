import 'package:flutter/material.dart';

/// Colorblind-safe coverage status colors (avoid pure red/green confusion by
/// pairing hue with distinct lightness/saturation).
class CoverageColors {
  CoverageColors._();

  static const green = Color(0xFF22C55E);
  static const yellow = Color(0xFFEAB308);
  static const red = Color(0xFFEF4444);
  static const unknown = Color(0xFF64748B);

  static Color forStatus(String status) {
    switch (status) {
      case 'green':
        return green;
      case 'yellow':
        return yellow;
      case 'red':
        return red;
      default:
        return unknown;
    }
  }
}
