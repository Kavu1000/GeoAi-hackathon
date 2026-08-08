import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../app/router/routes.dart';
import '../../../core/storage/prefs.dart';

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
                  child: Text(_page < 2 ? 'Next' : 'Get started'),
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
      title: 'ພາສາ / Language',
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
      onPressed: () => ref.read(sharedPreferencesProvider).setString(PrefsKeys.locale, code),
      child: Text(label),
    );
  }
}

class _PermissionStep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      title: 'Location access',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'We use your location to map internet coverage near you. It is never shared with your identity attached.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => Permission.locationWhenInUse.request(),
            child: const Text('Allow location'),
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
    return const _StepScaffold(
      title: 'Before you start',
      child: Text(
        'Signal samples are linked to a hex grid cell, not your exact path. '
        'You can turn off background sampling at any time in Settings.',
        textAlign: TextAlign.center,
      ),
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
