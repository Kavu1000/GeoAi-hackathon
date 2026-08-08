import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/storage/prefs.dart';
import '../../features/map/presentation/map_screen.dart';
import '../../features/measurement/presentation/speed_test_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/report/presentation/report_form_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import 'routes.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: Routes.home,
    redirect: (context, state) {
      final prefs = ref.read(sharedPreferencesProvider);
      final onboarded = prefs.getBool(PrefsKeys.onboardingComplete) ?? false;
      final goingToOnboarding = state.matchedLocation == Routes.onboarding;

      if (!onboarded && !goingToOnboarding) return Routes.onboarding;
      if (onboarded && goingToOnboarding) return Routes.home;
      return null;
    },
    routes: [
      GoRoute(path: Routes.onboarding, builder: (context, state) => const OnboardingScreen()),
      GoRoute(path: Routes.home, builder: (context, state) => const MapScreen()),
      GoRoute(path: Routes.report, builder: (context, state) => const ReportFormScreen()),
      GoRoute(path: Routes.speedTest, builder: (context, state) => const SpeedTestScreen()),
      GoRoute(path: Routes.settings, builder: (context, state) => const SettingsScreen()),
    ],
  );
});
