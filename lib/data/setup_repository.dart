import 'dart:convert';
import 'dart:io';

import '../models/tuning_setup.dart';

/// Persists all tuning setups as one JSON file on local storage.
///
/// Deliberately pure Dart (no Flutter/plugin imports) so it can be unit
/// tested without the Flutter test harness or a real device: callers pass
/// in the target [Directory] (in the app, that's the platform documents
/// directory resolved via `path_provider`; in tests, a temp directory).
class SetupRepository {
  SetupRepository(this._directory, {this.fileName = 'tuning_setups.json'});

  final Directory _directory;
  final String fileName;

  File get _file => File('${_directory.path}/$fileName');

  Future<List<TuningSetup>> loadAll() async {
    final file = _file;
    if (!await file.exists()) return [];
    final content = await file.readAsString();
    if (content.trim().isEmpty) return [];
    final decoded = jsonDecode(content) as List<dynamic>;
    return decoded
        .map((entry) => TuningSetup.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveAll(List<TuningSetup> setups) async {
    if (!await _directory.exists()) {
      await _directory.create(recursive: true);
    }
    final jsonList = setups.map((setup) => setup.toJson()).toList();
    await _file.writeAsString(jsonEncode(jsonList));
  }
}
