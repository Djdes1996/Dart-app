import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:gt7_tuning_companion/data/setup_repository.dart';
import 'package:gt7_tuning_companion/models/tuning_setup.dart';

void main() {
  late Directory tempDir;
  late SetupRepository repository;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('gt7_repo_test_');
    repository = SetupRepository(tempDir);
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('loadAll returns empty list when no file exists', () async {
    expect(await repository.loadAll(), isEmpty);
  });

  test('saveAll then loadAll round-trips setups', () async {
    final setup = TuningSetup(
      id: '1',
      carName: 'Honda Civic Type R',
      createdAt: DateTime.utc(2026, 1, 1),
      updatedAt: DateTime.utc(2026, 1, 1),
      tires: const TireSettings(compound: TireCompound.racingSoft),
    );

    await repository.saveAll([setup]);
    final loaded = await repository.loadAll();

    expect(loaded, hasLength(1));
    expect(loaded.first.carName, 'Honda Civic Type R');
    expect(loaded.first.tires.compound, TireCompound.racingSoft);
  });

  test('saveAll overwrites previous contents', () async {
    final first = TuningSetup(
      id: '1',
      carName: 'Car A',
      createdAt: DateTime.utc(2026, 1, 1),
      updatedAt: DateTime.utc(2026, 1, 1),
    );
    final second = TuningSetup(
      id: '2',
      carName: 'Car B',
      createdAt: DateTime.utc(2026, 1, 1),
      updatedAt: DateTime.utc(2026, 1, 1),
    );

    await repository.saveAll([first]);
    await repository.saveAll([first, second]);
    final loaded = await repository.loadAll();

    expect(loaded, hasLength(2));
  });

  test('loadAll returns empty list for blank file', () async {
    final file = File('${tempDir.path}/tuning_setups.json');
    await file.writeAsString('   ');

    expect(await repository.loadAll(), isEmpty);
  });
}
