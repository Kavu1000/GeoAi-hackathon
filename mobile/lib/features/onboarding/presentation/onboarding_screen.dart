import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../app/router/routes.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../core/storage/prefs.dart';
import '../../../l10n/generated/app_localizations.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _page = 0;

  void _next() {
    if (_page < 2) {
      _pageController.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    } else {
      _finish();
    }
  }

  Future<void> _finish() async {
    await ref.read(sharedPreferencesProvider).setBool(PrefsKeys.onboardingComplete, true);
    if (mounted) context.go(Routes.home);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: (i) => setState(() => _page = i),
                children: [
                  _LanguageStep(),
                  _PermissionStep(),
                  const _ConsentStep(),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _next,
                  child: Text(_page < 2 ? t.onboardingNext : t.onboardingGetStarted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageStep extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _StepScaffold(
      // Bilingual by design — this is the picker deciding which language to
      // show everywhere else, so it can't itself depend on the chosen locale.
      title: AppLocalizations.of(context)!.onboardingLanguageTitle,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LangButton(code: 'lo', label: 'ລາວ'),
          const SizedBox(height: 12),
          _LangButton(code: 'en', label: 'English'),
        ],
      ),
    );
  }
}

class _LangButton extends ConsumerWidget {
  final String code;
  final String label;
  const _LangButton({required this.code, required this.label});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OutlinedButton(
      onPressed: () {
        ref.read(sharedPreferencesProvider).setString(PrefsKeys.locale, code);
        ref.read(localeProvider.notifier).state = Locale(code);
      },
      child: Text(label),
    );
  }
}

class _PermissionStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return _StepScaffold(
      title: t.onboardingLocationTitle,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(t.onboardingLocationBody, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () async {
              await Permission.locationWhenInUse.request();
              // Same step, same "why": reading signal strength (Android's
              // TelephonyManager) needs this dangerous permission granted at
              // runtime too, not just declared in the manifest — asked for
              // together here since both exist for the same map-coverage
              // purpose, rather than surprising the user with a second
              // prompt mid-recording later (see SignalService.read()).
              await Permission.phone.request();
            },
            child: Text(t.onboardingAllowLocation),
          ),
        ],
      ),
    );
  }
}

class _ConsentStep extends StatelessWidget {
  const _ConsentStep();

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return _StepScaffold(
      title: t.onboardingConsentTitle,
      child: Text(t.onboardingConsentBody, textAlign: TextAlign.center),
    );
  }
}

class _StepScaffold extends StatelessWidget {
  final String title;
  final Widget child;
  const _StepScaffold({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            child,
          ],
        ),
      ),
    );
  }
}
