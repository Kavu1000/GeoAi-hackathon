import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../config/env.dart';

/// No auth — GET /cells (the same feature shape broadcast over this socket,
/// see backend's cellAggregation.service.ts) is already fully public and
/// unauthenticated, so there's nothing extra a token would protect here.
/// Connects immediately; socket.io's client auto-reconnects on its own, and
/// the map's existing bbox reload on pan/zoom already self-heals anything
/// missed during a disconnect.
final socketProvider = Provider<socket_io.Socket>((ref) {
  final socket = socket_io.io(Env.apiBaseUrl, socket_io.OptionBuilder().build());
  ref.onDispose(() => socket.dispose());
  return socket;
});
