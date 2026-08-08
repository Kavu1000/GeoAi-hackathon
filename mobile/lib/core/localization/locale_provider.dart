import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/prefs.dart';

/// Current app locale. Defaults to Lao ('lo') — this is a Lao-first app —
/// falling back to whatever the onboarding language step last saved.
/// The onboarding language buttons update this directly (in addition to
/// persisting it) so the switch takes effect without an app restart.
final localeProvider = StateProvider<Locale>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  final code = prefs.getString(PrefsKeys.locale) ?? 'lo';
  return Locale(code);
});
