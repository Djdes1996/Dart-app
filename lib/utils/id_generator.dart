import 'dart:math';

/// Generates a short, sufficiently unique local id for a tuning setup.
/// No backend involved, so this only needs to avoid collisions on-device.
String generateId() {
  final random = Random();
  final randomPart =
      List.generate(8, (_) => random.nextInt(16).toRadixString(16)).join();
  final timePart = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
  return '$timePart$randomPart';
}
