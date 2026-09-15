import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/tuning_setup.dart';
import '../state/setup_store.dart';
import '../utils/id_generator.dart';

/// Add/edit form for a tuning setup. Every tuning field is optional except
/// the car name, since not every category applies to every car/part combo.
class SetupFormScreen extends StatefulWidget {
  const SetupFormScreen({super.key, this.existing});

  final TuningSetup? existing;

  @override
  State<SetupFormScreen> createState() => _SetupFormScreenState();
}

class _SetupFormScreenState extends State<SetupFormScreen> {
  static const _gearCount = 8;

  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _carName;
  late final TextEditingController _track;
  late final TextEditingController _notes;

  TireCompound? _tireCompound;
  late final TextEditingController _tirePressureFront;
  late final TextEditingController _tirePressureRear;

  late final TextEditingController _rideHeightFront;
  late final TextEditingController _rideHeightRear;
  late final TextEditingController _antiRollBarFront;
  late final TextEditingController _antiRollBarRear;
  late final TextEditingController _naturalFreqFront;
  late final TextEditingController _naturalFreqRear;
  late final TextEditingController _dampingCompressionFront;
  late final TextEditingController _dampingCompressionRear;
  late final TextEditingController _dampingExtensionFront;
  late final TextEditingController _dampingExtensionRear;
  late final TextEditingController _camberFront;
  late final TextEditingController _camberRear;
  late final TextEditingController _toeFront;
  late final TextEditingController _toeRear;

  late final TextEditingController _diffInitialFront;
  late final TextEditingController _diffInitialRear;
  late final TextEditingController _diffAccelFront;
  late final TextEditingController _diffAccelRear;
  late final TextEditingController _diffBrakingFront;
  late final TextEditingController _diffBrakingRear;

  late final List<TextEditingController> _gearRatios;
  late final TextEditingController _finalGear;
  late final TextEditingController _topSpeed;

  late final TextEditingController _downforceFront;
  late final TextEditingController _downforceRear;

  late final TextEditingController _brakeBalanceFront;
  late final TextEditingController _brakeBalanceRear;

  late final TextEditingController _ballastKg;
  late final TextEditingController _ballastPosition;
  late final TextEditingController _powerLimiter;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final setup = widget.existing;

    _carName = TextEditingController(text: setup?.carName ?? '');
    _track = TextEditingController(text: setup?.trackOrConditions ?? '');
    _notes = TextEditingController(text: setup?.notes ?? '');

    _tireCompound = setup?.tires.compound;
    _tirePressureFront = _ctrl(setup?.tires.pressureFrontKpa);
    _tirePressureRear = _ctrl(setup?.tires.pressureRearKpa);

    final suspension = setup?.suspension;
    _rideHeightFront = _ctrl(suspension?.rideHeightFrontMm);
    _rideHeightRear = _ctrl(suspension?.rideHeightRearMm);
    _antiRollBarFront = _ctrl(suspension?.antiRollBarFront?.toDouble());
    _antiRollBarRear = _ctrl(suspension?.antiRollBarRear?.toDouble());
    _naturalFreqFront = _ctrl(suspension?.naturalFrequencyFrontHz);
    _naturalFreqRear = _ctrl(suspension?.naturalFrequencyRearHz);
    _dampingCompressionFront = _ctrl(suspension?.dampingCompressionFront?.toDouble());
    _dampingCompressionRear = _ctrl(suspension?.dampingCompressionRear?.toDouble());
    _dampingExtensionFront = _ctrl(suspension?.dampingExtensionFront?.toDouble());
    _dampingExtensionRear = _ctrl(suspension?.dampingExtensionRear?.toDouble());
    _camberFront = _ctrl(suspension?.camberFrontDeg);
    _camberRear = _ctrl(suspension?.camberRearDeg);
    _toeFront = _ctrl(suspension?.toeFrontDeg);
    _toeRear = _ctrl(suspension?.toeRearDeg);

    final differential = setup?.differential;
    _diffInitialFront = _ctrl(differential?.initialFront?.toDouble());
    _diffInitialRear = _ctrl(differential?.initialRear?.toDouble());
    _diffAccelFront = _ctrl(differential?.accelerationFront?.toDouble());
    _diffAccelRear = _ctrl(differential?.accelerationRear?.toDouble());
    _diffBrakingFront = _ctrl(differential?.brakingFront?.toDouble());
    _diffBrakingRear = _ctrl(differential?.brakingRear?.toDouble());

    final gearing = setup?.gearing;
    _gearRatios = List.generate(_gearCount, (index) {
      final ratios = gearing?.gearRatios;
      final value = (ratios != null && index < ratios.length) ? ratios[index] : null;
      return _ctrl(value);
    });
    _finalGear = _ctrl(gearing?.finalGearRatio);
    _topSpeed = _ctrl(gearing?.topSpeedKmh?.toDouble());

    _downforceFront = _ctrl(setup?.aero.downforceFront?.toDouble());
    _downforceRear = _ctrl(setup?.aero.downforceRear?.toDouble());

    _brakeBalanceFront = _ctrl(setup?.brakes.balanceFront?.toDouble());
    _brakeBalanceRear = _ctrl(setup?.brakes.balanceRear?.toDouble());

    _ballastKg = _ctrl(setup?.weight.ballastKg?.toDouble());
    _ballastPosition = _ctrl(setup?.weight.ballastPosition?.toDouble());
    _powerLimiter = _ctrl(setup?.weight.powerLimiterPercent?.toDouble());
  }

  TextEditingController _ctrl(double? value) {
    if (value == null) return TextEditingController();
    final text = value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toString();
    return TextEditingController(text: text);
  }

  @override
  void dispose() {
    for (final controller in [
      _carName,
      _track,
      _notes,
      _tirePressureFront,
      _tirePressureRear,
      _rideHeightFront,
      _rideHeightRear,
      _antiRollBarFront,
      _antiRollBarRear,
      _naturalFreqFront,
      _naturalFreqRear,
      _dampingCompressionFront,
      _dampingCompressionRear,
      _dampingExtensionFront,
      _dampingExtensionRear,
      _camberFront,
      _camberRear,
      _toeFront,
      _toeRear,
      _diffInitialFront,
      _diffInitialRear,
      _diffAccelFront,
      _diffAccelRear,
      _diffBrakingFront,
      _diffBrakingRear,
      ..._gearRatios,
      _finalGear,
      _topSpeed,
      _downforceFront,
      _downforceRear,
      _brakeBalanceFront,
      _brakeBalanceRear,
      _ballastKg,
      _ballastPosition,
      _powerLimiter,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  double? _parse(TextEditingController controller) {
    final text = controller.text.trim().replaceAll(',', '.');
    if (text.isEmpty) return null;
    return double.tryParse(text);
  }

  int? _parseInt(TextEditingController controller) => _parse(controller)?.round();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Setup bewerken' : 'Nieuwe setup')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            TextFormField(
              controller: _carName,
              decoration: const InputDecoration(
                labelText: 'Auto *',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Verplicht' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _track,
              decoration: const InputDecoration(
                labelText: 'Track / omstandigheden (optioneel)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            _SectionTile(
              title: 'Banden',
              children: [
                DropdownButtonFormField<TireCompound>(
                  initialValue: _tireCompound,
                  decoration: const InputDecoration(
                    labelText: 'Compound',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    for (final compound in TireCompound.values)
                      DropdownMenuItem(value: compound, child: Text(compound.label)),
                  ],
                  onChanged: (value) => setState(() => _tireCompound = value),
                ),
                const SizedBox(height: 4),
                _pairRow('Bandenspanning voor', _tirePressureFront,
                    'Bandenspanning achter', _tirePressureRear),
              ],
            ),
            _SectionTile(
              title: 'Ophanging',
              children: [
                _pairRow('Rijhoogte voor (mm)', _rideHeightFront, 'Rijhoogte achter (mm)',
                    _rideHeightRear),
                _pairRow('Stabistang voor', _antiRollBarFront, 'Stabistang achter',
                    _antiRollBarRear),
                _pairRow('Eigenfrequentie voor (Hz)', _naturalFreqFront,
                    'Eigenfrequentie achter (Hz)', _naturalFreqRear),
                _pairRow('Demping compressie voor', _dampingCompressionFront,
                    'Demping compressie achter', _dampingCompressionRear),
                _pairRow('Demping extensie voor', _dampingExtensionFront,
                    'Demping extensie achter', _dampingExtensionRear),
                _pairRow('Camber voor (°)', _camberFront, 'Camber achter (°)', _camberRear),
                _pairRow('Toe voor (°)', _toeFront, 'Toe achter (°)', _toeRear),
              ],
            ),
            _SectionTile(
              title: 'Differentieel (LSD)',
              children: [
                _pairRow('Initieel voor', _diffInitialFront, 'Initieel achter',
                    _diffInitialRear),
                _pairRow('Acceleratie voor', _diffAccelFront, 'Acceleratie achter',
                    _diffAccelRear),
                _pairRow('Remmen voor', _diffBrakingFront, 'Remmen achter',
                    _diffBrakingRear),
              ],
            ),
            _SectionTile(
              title: 'Versnellingsbak',
              children: [
                for (var i = 0; i < _gearCount; i += 2)
                  _pairRow(
                    'Versnelling ${i + 1}',
                    _gearRatios[i],
                    i + 1 < _gearCount ? 'Versnelling ${i + 2}' : null,
                    i + 1 < _gearCount ? _gearRatios[i + 1] : null,
                  ),
                _pairRow('Eindoverbrenging', _finalGear, 'Topsnelheid (km/h)', _topSpeed),
              ],
            ),
            _SectionTile(
              title: 'Aerodynamica',
              children: [
                _pairRow('Downforce voor', _downforceFront, 'Downforce achter',
                    _downforceRear),
              ],
            ),
            _SectionTile(
              title: 'Remmen',
              children: [
                _pairRow('Balans voor', _brakeBalanceFront, 'Balans achter',
                    _brakeBalanceRear),
              ],
            ),
            _SectionTile(
              title: 'Gewicht & vermogen',
              children: [
                _pairRow('Ballast (kg)', _ballastKg, 'Ballastpositie (-50..50)',
                    _ballastPosition),
                _numField('Vermogensbegrenzer (%)', _powerLimiter),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notes,
              decoration: const InputDecoration(
                labelText: 'Notities (optioneel)',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _save,
              child: Text(_isEditing ? 'Wijzigingen opslaan' : 'Setup opslaan'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pairRow(
    String labelA,
    TextEditingController controllerA, [
    String? labelB,
    TextEditingController? controllerB,
  ]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: _numField(labelA, controllerA)),
          if (labelB != null && controllerB != null) ...[
            const SizedBox(width: 12),
            Expanded(child: _numField(labelB, controllerB)),
          ] else
            const Spacer(),
        ],
      ),
    );
  }

  Widget _numField(String label, TextEditingController controller) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        isDense: true,
      ),
      keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
      validator: (value) {
        if (value == null || value.trim().isEmpty) return null;
        return double.tryParse(value.trim().replaceAll(',', '.')) == null
            ? 'Ongeldig'
            : null;
      },
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final now = DateTime.now();
    final gearRatios = _gearRatios.map(_parse).toList();
    while (gearRatios.isNotEmpty && gearRatios.last == null) {
      gearRatios.removeLast();
    }

    final setup = TuningSetup(
      id: widget.existing?.id ?? generateId(),
      carName: _carName.text.trim(),
      trackOrConditions:
          _track.text.trim().isEmpty ? null : _track.text.trim(),
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      createdAt: widget.existing?.createdAt ?? now,
      updatedAt: now,
      suspension: SuspensionSettings(
        rideHeightFrontMm: _parse(_rideHeightFront),
        rideHeightRearMm: _parse(_rideHeightRear),
        antiRollBarFront: _parseInt(_antiRollBarFront),
        antiRollBarRear: _parseInt(_antiRollBarRear),
        naturalFrequencyFrontHz: _parse(_naturalFreqFront),
        naturalFrequencyRearHz: _parse(_naturalFreqRear),
        dampingCompressionFront: _parseInt(_dampingCompressionFront),
        dampingCompressionRear: _parseInt(_dampingCompressionRear),
        dampingExtensionFront: _parseInt(_dampingExtensionFront),
        dampingExtensionRear: _parseInt(_dampingExtensionRear),
        camberFrontDeg: _parse(_camberFront),
        camberRearDeg: _parse(_camberRear),
        toeFrontDeg: _parse(_toeFront),
        toeRearDeg: _parse(_toeRear),
      ),
      differential: DifferentialSettings(
        initialFront: _parseInt(_diffInitialFront),
        initialRear: _parseInt(_diffInitialRear),
        accelerationFront: _parseInt(_diffAccelFront),
        accelerationRear: _parseInt(_diffAccelRear),
        brakingFront: _parseInt(_diffBrakingFront),
        brakingRear: _parseInt(_diffBrakingRear),
      ),
      gearing: GearingSettings(
        gearRatios: gearRatios,
        finalGearRatio: _parse(_finalGear),
        topSpeedKmh: _parseInt(_topSpeed),
      ),
      aero: AeroSettings(
        downforceFront: _parseInt(_downforceFront),
        downforceRear: _parseInt(_downforceRear),
      ),
      brakes: BrakeSettings(
        balanceFront: _parseInt(_brakeBalanceFront),
        balanceRear: _parseInt(_brakeBalanceRear),
      ),
      weight: WeightSettings(
        ballastKg: _parseInt(_ballastKg),
        ballastPosition: _parseInt(_ballastPosition),
        powerLimiterPercent: _parseInt(_powerLimiter),
      ),
      tires: TireSettings(
        compound: _tireCompound,
        pressureFrontKpa: _parse(_tirePressureFront),
        pressureRearKpa: _parse(_tirePressureRear),
      ),
    );

    final store = context.read<SetupStore>();
    if (_isEditing) {
      await store.update(setup);
    } else {
      await store.add(setup);
    }
    if (mounted) Navigator.of(context).pop();
  }
}

class _SectionTile extends StatelessWidget {
  const _SectionTile({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        children: children,
      ),
    );
  }
}
