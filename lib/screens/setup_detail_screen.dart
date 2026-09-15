import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/tuning_setup.dart';
import '../state/setup_store.dart';
import 'setup_form_screen.dart';

class SetupDetailScreen extends StatelessWidget {
  const SetupDetailScreen({super.key, required this.setupId});

  final String setupId;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<SetupStore>();
    final setup = store.byId(setupId);

    if (setup == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Setup')),
        body: const Center(child: Text('Deze setup bestaat niet meer.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(setup.carName),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            tooltip: 'Bewerken',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => SetupFormScreen(existing: setup)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (setup.trackOrConditions?.isNotEmpty ?? false)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                setup.trackOrConditions!,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
          _Section(title: 'Banden', rows: [
            _row('Band', setup.tires.compound?.label),
            _row('Bandenspanning voor', _fmt(setup.tires.pressureFrontKpa, 'kPa')),
            _row('Bandenspanning achter', _fmt(setup.tires.pressureRearKpa, 'kPa')),
          ]),
          _Section(title: 'Ophanging', rows: [
            _row('Rijhoogte voor', _fmt(setup.suspension.rideHeightFrontMm, 'mm')),
            _row('Rijhoogte achter', _fmt(setup.suspension.rideHeightRearMm, 'mm')),
            _row('Stabistang voor', _fmt(setup.suspension.antiRollBarFront?.toDouble())),
            _row('Stabistang achter', _fmt(setup.suspension.antiRollBarRear?.toDouble())),
            _row('Eigenfrequentie voor',
                _fmt(setup.suspension.naturalFrequencyFrontHz, 'Hz')),
            _row('Eigenfrequentie achter',
                _fmt(setup.suspension.naturalFrequencyRearHz, 'Hz')),
            _row('Demping compressie voor',
                _fmt(setup.suspension.dampingCompressionFront?.toDouble())),
            _row('Demping compressie achter',
                _fmt(setup.suspension.dampingCompressionRear?.toDouble())),
            _row('Demping extensie voor',
                _fmt(setup.suspension.dampingExtensionFront?.toDouble())),
            _row('Demping extensie achter',
                _fmt(setup.suspension.dampingExtensionRear?.toDouble())),
            _row('Camber voor', _fmt(setup.suspension.camberFrontDeg, '°')),
            _row('Camber achter', _fmt(setup.suspension.camberRearDeg, '°')),
            _row('Toe voor', _fmt(setup.suspension.toeFrontDeg, '°')),
            _row('Toe achter', _fmt(setup.suspension.toeRearDeg, '°')),
          ]),
          _Section(title: 'Differentieel (LSD)', rows: [
            _row('Initieel voor', _fmt(setup.differential.initialFront?.toDouble())),
            _row('Initieel achter', _fmt(setup.differential.initialRear?.toDouble())),
            _row('Acceleratie voor',
                _fmt(setup.differential.accelerationFront?.toDouble())),
            _row('Acceleratie achter',
                _fmt(setup.differential.accelerationRear?.toDouble())),
            _row('Remmen voor', _fmt(setup.differential.brakingFront?.toDouble())),
            _row('Remmen achter', _fmt(setup.differential.brakingRear?.toDouble())),
          ]),
          _Section(title: 'Versnellingsbak', rows: [
            for (var i = 0; i < setup.gearing.gearRatios.length; i++)
              _row('Versnelling ${i + 1}', _fmt(setup.gearing.gearRatios[i])),
            _row('Eindoverbrenging', _fmt(setup.gearing.finalGearRatio)),
            _row('Topsnelheid', _fmt(setup.gearing.topSpeedKmh?.toDouble(), 'km/h')),
          ]),
          _Section(title: 'Aerodynamica', rows: [
            _row('Downforce voor', _fmt(setup.aero.downforceFront?.toDouble())),
            _row('Downforce achter', _fmt(setup.aero.downforceRear?.toDouble())),
          ]),
          _Section(title: 'Remmen', rows: [
            _row('Balans voor', _fmt(setup.brakes.balanceFront?.toDouble())),
            _row('Balans achter', _fmt(setup.brakes.balanceRear?.toDouble())),
          ]),
          _Section(title: 'Gewicht & vermogen', rows: [
            _row('Ballast', _fmt(setup.weight.ballastKg?.toDouble(), 'kg')),
            _row('Ballastpositie', _fmt(setup.weight.ballastPosition?.toDouble())),
            _row('Vermogensbegrenzer',
                _fmt(setup.weight.powerLimiterPercent?.toDouble(), '%')),
          ]),
          if (setup.notes?.isNotEmpty ?? false)
            Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Notities',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(setup.notes!),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  static MapEntry<String, String?> _row(String label, [String? value]) =>
      MapEntry(label, value);

  static String? _fmt(double? value, [String unit = '']) {
    if (value == null) return null;
    final text =
        value == value.roundToDouble() ? value.toStringAsFixed(0) : value.toString();
    return unit.isEmpty ? text : '$text $unit';
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.rows});

  final String title;
  final List<MapEntry<String, String?>> rows;

  @override
  Widget build(BuildContext context) {
    final filled = rows.where((row) => row.value != null).toList();
    if (filled.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            for (final row in filled)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(row.key, style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(width: 12),
                    Text(
                      row.value!,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
