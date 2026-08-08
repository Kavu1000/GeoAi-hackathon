import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('overridden in bootstrap.dart before runApp');
});

class PrefsKeys {
  PrefsKeys._();
  static const onboardingComplete = 'onboarding_complete';
  static const backgroundSamplingEnabled = 'background_sampling_enabled';
  static const locale = 'locale';
}
