class Env {
  Env._();

  static const apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    // Live deployed backend (Render). Override with
    // --dart-define=API_BASE_URL=http://10.0.2.2:4000 for an Android
    // emulator talking to a locally-run backend instead.
    defaultValue: "https://connect4all-backend.onrender.com",
  );
}
