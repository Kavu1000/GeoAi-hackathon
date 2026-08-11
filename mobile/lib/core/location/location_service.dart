import 'package:geolocator/geolocator.dart';

/// Why a position couldn't be read — distinct from a plain `null`, so
/// callers can tell "you haven't granted permission" apart from "GPS is
/// switched off at the OS level" and show an actionable message for each,
/// instead of silently doing nothing (see RecordController).
enum LocationAvailability { ok, permissionDenied, serviceDisabled }

class LocationService {
  Future<bool> ensurePermission() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
  }

  Future<LocationAvailability> checkAvailability() async {
    if (!await ensurePermission()) return LocationAvailability.permissionDenied;
    // Permission granted is not the same as GPS actually being on — the
    // device-level Location toggle can be off independently, and that's a
    // very ordinary state to find a phone in (this was the actual cause of
    // the Record screen's counters silently staying at 0: permission was
    // granted, but isLocationServiceEnabled() was false on every tick).
    if (!await Geolocator.isLocationServiceEnabled()) return LocationAvailability.serviceDisabled;
    return LocationAvailability.ok;
  }

  Future<Position?> getCurrentPosition() async {
    if (await checkAvailability() != LocationAvailability.ok) return null;
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      // Without a limit this can hang indefinitely when GPS is on but
      // can't actually resolve a fix (deep indoors, no sky view, no
      // wifi/cell fallback available) — a stuck call would otherwise never
      // return, silently blocking every future tick behind it since
      // RecordController's Timer.periodic doesn't run ticks concurrently.
      timeLimit: const Duration(seconds: 20),
    );
  }
}
