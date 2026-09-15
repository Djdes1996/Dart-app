import 'package:flutter/foundation.dart';

import '../data/setup_repository.dart';
import '../models/tuning_setup.dart';

/// In-memory cache of tuning setups, backed by [SetupRepository].
/// Every mutation updates the in-memory list first (so the UI reflects it
/// immediately) and then persists the full list to disk.
class SetupStore extends ChangeNotifier {
  SetupStore(this._repository);

  final SetupRepository _repository;
  List<TuningSetup> _setups = [];
  bool _isLoading = true;

  List<TuningSetup> get setups => List.unmodifiable(_setups);
  bool get isLoading => _isLoading;

  Future<void> load() async {
    _isLoading = true;
    notifyListeners();
    _setups = await _repository.loadAll();
    _sort();
    _isLoading = false;
    notifyListeners();
  }

  TuningSetup? byId(String id) {
    for (final setup in _setups) {
      if (setup.id == id) return setup;
    }
    return null;
  }

  Future<void> add(TuningSetup setup) async {
    _setups.add(setup);
    _sort();
    notifyListeners();
    await _repository.saveAll(_setups);
  }

  Future<void> update(TuningSetup setup) async {
    final index = _setups.indexWhere((existing) => existing.id == setup.id);
    if (index == -1) return;
    _setups[index] = setup;
    _sort();
    notifyListeners();
    await _repository.saveAll(_setups);
  }

  Future<void> delete(String id) async {
    _setups.removeWhere((setup) => setup.id == id);
    notifyListeners();
    await _repository.saveAll(_setups);
  }

  void _sort() {
    _setups.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }
}
