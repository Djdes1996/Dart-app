import 'package:flutter_test/flutter_test.dart';
import 'package:gt7_tuning_companion/models/tuning_setup.dart';

void main() {
  group('TuningSetup JSON round-trip', () {
    test('serializes and deserializes all fields', () {
      final setup = TuningSetup(
        id: 'abc123',
        carName: 'Toyota GR86',
        trackOrConditions: 'Tsukuba - droog',
        notes: 'Testnotitie',
        createdAt: DateTime.utc(2026, 1, 1, 10),
        updatedAt: DateTime.utc(2026, 1, 2, 11),
        suspension: const SuspensionSettings(
          rideHeightFrontMm: 100,
          rideHeightRearMm: 105,
          antiRollBarFront: 5,
          antiRollBarRear: 4,
          naturalFrequencyFrontHz: 2.4,
          naturalFrequencyRearHz: 2.2,
          dampingCompressionFront: 30,
          dampingCompressionRear: 28,
          dampingExtensionFront: 34,
          dampingExtensionRear: 32,
          camberFrontDeg: 2.0,
          camberRearDeg: 1.5,
          toeFrontDeg: -0.1,
          toeRearDeg: 0.2,
        ),
        differential: const DifferentialSettings(
          initialFront: 10,
          initialRear: 15,
          accelerationFront: 20,
          accelerationRear: 25,
          brakingFront: 5,
          brakingRear: 8,
        ),
        gearing: const GearingSettings(
          gearRatios: [3.5, 2.4, 1.8, 1.4, 1.1, 0.9],
          finalGearRatio: 4.1,
          topSpeedKmh: 240,
        ),
        aero: const AeroSettings(downforceFront: 100, downforceRear: 180),
        brakes: const BrakeSettings(balanceFront: 5, balanceRear: 4),
        weight: const WeightSettings(
          ballastKg: 20,
          ballastPosition: -10,
          powerLimiterPercent: 100,
        ),
        tires: const TireSettings(
          compound: TireCompound.sportsMedium,
          pressureFrontKpa: 220,
          pressureRearKpa: 210,
        ),
      );

      final json = setup.toJson();
      final restored = TuningSetup.fromJson(json);

      expect(restored.id, setup.id);
      expect(restored.carName, setup.carName);
      expect(restored.trackOrConditions, setup.trackOrConditions);
      expect(restored.notes, setup.notes);
      expect(restored.createdAt, setup.createdAt);
      expect(restored.updatedAt, setup.updatedAt);
      expect(restored.suspension.rideHeightFrontMm, 100);
      expect(restored.suspension.camberRearDeg, 1.5);
      expect(restored.differential.accelerationRear, 25);
      expect(restored.gearing.gearRatios, [3.5, 2.4, 1.8, 1.4, 1.1, 0.9]);
      expect(restored.gearing.topSpeedKmh, 240);
      expect(restored.aero.downforceRear, 180);
      expect(restored.brakes.balanceFront, 5);
      expect(restored.weight.ballastPosition, -10);
      expect(restored.tires.compound, TireCompound.sportsMedium);
      expect(restored.tires.pressureFrontKpa, 220);
    });

    test('handles missing/null sections gracefully', () {
      final json = {
        'id': 'x',
        'carName': 'Mazda MX-5',
        'createdAt': DateTime.utc(2026, 1, 1).toIso8601String(),
        'updatedAt': DateTime.utc(2026, 1, 1).toIso8601String(),
      };

      final restored = TuningSetup.fromJson(json);

      expect(restored.carName, 'Mazda MX-5');
      expect(restored.suspension.rideHeightFrontMm, isNull);
      expect(restored.gearing.gearRatios, isEmpty);
      expect(restored.tires.compound, isNull);
    });
  });

  test('copyWith only overrides provided fields', () {
    final original = TuningSetup(
      id: '1',
      carName: 'Nissan GT-R',
      createdAt: DateTime.utc(2026, 1, 1),
      updatedAt: DateTime.utc(2026, 1, 1),
    );

    final updated = original.copyWith(carName: 'Nissan GT-R Nismo');

    expect(updated.id, original.id);
    expect(updated.carName, 'Nissan GT-R Nismo');
    expect(updated.createdAt, original.createdAt);
  });
}
