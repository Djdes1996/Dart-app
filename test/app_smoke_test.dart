import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gt7_tuning_companion/data/setup_repository.dart';
import 'package:gt7_tuning_companion/main.dart';
import 'package:gt7_tuning_companion/state/setup_store.dart';

void main() {
  testWidgets('shows empty state when no setups are saved', (tester) async {
    final tempDir = await Directory.systemTemp.createTemp('gt7_widget_test_');
    addTearDown(() => tempDir.delete(recursive: true));

    final store = SetupStore(SetupRepository(tempDir));
    await store.load();

    await tester.pumpWidget(GT7CompanionApp(store: store));
    await tester.pumpAndSettle();

    expect(find.text('Nog geen tuning-setups'), findsOneWidget);
    expect(find.text('GT7 Tuning Setups'), findsOneWidget);
  });

  testWidgets('creating a setup shows it in the list', (tester) async {
    final tempDir = await Directory.systemTemp.createTemp('gt7_widget_test_');
    addTearDown(() => tempDir.delete(recursive: true));

    final store = SetupStore(SetupRepository(tempDir));
    await store.load();

    await tester.pumpWidget(GT7CompanionApp(store: store));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Nieuwe setup'));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Auto *'), 'Mazda RX-7');
    await tester.tap(find.text('Setup opslaan'));
    await tester.pumpAndSettle();

    expect(find.text('Mazda RX-7'), findsOneWidget);
  });
}
