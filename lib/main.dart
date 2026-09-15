import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';

import 'data/setup_repository.dart';
import 'screens/setup_list_screen.dart';
import 'state/setup_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final directory = await getApplicationDocumentsDirectory();
  final store = SetupStore(SetupRepository(directory));
  await store.load();
  runApp(GT7CompanionApp(store: store));
}

class GT7CompanionApp extends StatelessWidget {
  const GT7CompanionApp({super.key, required this.store});

  final SetupStore store;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<SetupStore>.value(
      value: store,
      child: MaterialApp(
        title: 'GT7 Tuning Companion',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1565C0),
          ),
          useMaterial3: true,
        ),
        darkTheme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1565C0),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
        ),
        home: const SetupListScreen(),
      ),
    );
  }
}
