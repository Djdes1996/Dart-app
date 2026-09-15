/// Data model for a single Gran Turismo 7 tuning setup.
///
/// Every numeric field is optional: a setup rarely fills in every category,
/// since not all parts (e.g. fully custom suspension or LSD) are installed
/// on every car.
library;

double? _asDouble(dynamic value) => value == null ? null : (value as num).toDouble();

int? _asInt(dynamic value) => value == null ? null : (value as num).toInt();

class TuningSetup {
  const TuningSetup({
    required this.id,
    required this.carName,
    this.trackOrConditions,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.suspension = const SuspensionSettings(),
    this.differential = const DifferentialSettings(),
    this.gearing = const GearingSettings(),
    this.aero = const AeroSettings(),
    this.brakes = const BrakeSettings(),
    this.weight = const WeightSettings(),
    this.tires = const TireSettings(),
  });

  final String id;
  final String carName;
  final String? trackOrConditions;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final SuspensionSettings suspension;
  final DifferentialSettings differential;
  final GearingSettings gearing;
  final AeroSettings aero;
  final BrakeSettings brakes;
  final WeightSettings weight;
  final TireSettings tires;

  TuningSetup copyWith({
    String? carName,
    String? trackOrConditions,
    String? notes,
    DateTime? updatedAt,
    SuspensionSettings? suspension,
    DifferentialSettings? differential,
    GearingSettings? gearing,
    AeroSettings? aero,
    BrakeSettings? brakes,
    WeightSettings? weight,
    TireSettings? tires,
  }) {
    return TuningSetup(
      id: id,
      carName: carName ?? this.carName,
      trackOrConditions: trackOrConditions ?? this.trackOrConditions,
      notes: notes ?? this.notes,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      suspension: suspension ?? this.suspension,
      differential: differential ?? this.differential,
      gearing: gearing ?? this.gearing,
      aero: aero ?? this.aero,
      brakes: brakes ?? this.brakes,
      weight: weight ?? this.weight,
      tires: tires ?? this.tires,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'carName': carName,
        'trackOrConditions': trackOrConditions,
        'notes': notes,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'suspension': suspension.toJson(),
        'differential': differential.toJson(),
        'gearing': gearing.toJson(),
        'aero': aero.toJson(),
        'brakes': brakes.toJson(),
        'weight': weight.toJson(),
        'tires': tires.toJson(),
      };

  factory TuningSetup.fromJson(Map<String, dynamic> json) => TuningSetup(
        id: json['id'] as String,
        carName: json['carName'] as String,
        trackOrConditions: json['trackOrConditions'] as String?,
        notes: json['notes'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        suspension: SuspensionSettings.fromJson(
            (json['suspension'] as Map<String, dynamic>?) ?? const {}),
        differential: DifferentialSettings.fromJson(
            (json['differential'] as Map<String, dynamic>?) ?? const {}),
        gearing: GearingSettings.fromJson(
            (json['gearing'] as Map<String, dynamic>?) ?? const {}),
        aero: AeroSettings.fromJson((json['aero'] as Map<String, dynamic>?) ?? const {}),
        brakes:
            BrakeSettings.fromJson((json['brakes'] as Map<String, dynamic>?) ?? const {}),
        weight:
            WeightSettings.fromJson((json['weight'] as Map<String, dynamic>?) ?? const {}),
        tires: TireSettings.fromJson((json['tires'] as Map<String, dynamic>?) ?? const {}),
      );
}

class SuspensionSettings {
  const SuspensionSettings({
    this.rideHeightFrontMm,
    this.rideHeightRearMm,
    this.antiRollBarFront,
    this.antiRollBarRear,
    this.naturalFrequencyFrontHz,
    this.naturalFrequencyRearHz,
    this.dampingCompressionFront,
    this.dampingCompressionRear,
    this.dampingExtensionFront,
    this.dampingExtensionRear,
    this.camberFrontDeg,
    this.camberRearDeg,
    this.toeFrontDeg,
    this.toeRearDeg,
  });

  final double? rideHeightFrontMm;
  final double? rideHeightRearMm;
  final int? antiRollBarFront;
  final int? antiRollBarRear;
  final double? naturalFrequencyFrontHz;
  final double? naturalFrequencyRearHz;
  final int? dampingCompressionFront;
  final int? dampingCompressionRear;
  final int? dampingExtensionFront;
  final int? dampingExtensionRear;
  final double? camberFrontDeg;
  final double? camberRearDeg;
  final double? toeFrontDeg;
  final double? toeRearDeg;

  Map<String, dynamic> toJson() => {
        'rideHeightFrontMm': rideHeightFrontMm,
        'rideHeightRearMm': rideHeightRearMm,
        'antiRollBarFront': antiRollBarFront,
        'antiRollBarRear': antiRollBarRear,
        'naturalFrequencyFrontHz': naturalFrequencyFrontHz,
        'naturalFrequencyRearHz': naturalFrequencyRearHz,
        'dampingCompressionFront': dampingCompressionFront,
        'dampingCompressionRear': dampingCompressionRear,
        'dampingExtensionFront': dampingExtensionFront,
        'dampingExtensionRear': dampingExtensionRear,
        'camberFrontDeg': camberFrontDeg,
        'camberRearDeg': camberRearDeg,
        'toeFrontDeg': toeFrontDeg,
        'toeRearDeg': toeRearDeg,
      };

  factory SuspensionSettings.fromJson(Map<String, dynamic> json) => SuspensionSettings(
        rideHeightFrontMm: _asDouble(json['rideHeightFrontMm']),
        rideHeightRearMm: _asDouble(json['rideHeightRearMm']),
        antiRollBarFront: _asInt(json['antiRollBarFront']),
        antiRollBarRear: _asInt(json['antiRollBarRear']),
        naturalFrequencyFrontHz: _asDouble(json['naturalFrequencyFrontHz']),
        naturalFrequencyRearHz: _asDouble(json['naturalFrequencyRearHz']),
        dampingCompressionFront: _asInt(json['dampingCompressionFront']),
        dampingCompressionRear: _asInt(json['dampingCompressionRear']),
        dampingExtensionFront: _asInt(json['dampingExtensionFront']),
        dampingExtensionRear: _asInt(json['dampingExtensionRear']),
        camberFrontDeg: _asDouble(json['camberFrontDeg']),
        camberRearDeg: _asDouble(json['camberRearDeg']),
        toeFrontDeg: _asDouble(json['toeFrontDeg']),
        toeRearDeg: _asDouble(json['toeRearDeg']),
      );
}

class DifferentialSettings {
  const DifferentialSettings({
    this.initialFront,
    this.initialRear,
    this.accelerationFront,
    this.accelerationRear,
    this.brakingFront,
    this.brakingRear,
  });

  final int? initialFront;
  final int? initialRear;
  final int? accelerationFront;
  final int? accelerationRear;
  final int? brakingFront;
  final int? brakingRear;

  Map<String, dynamic> toJson() => {
        'initialFront': initialFront,
        'initialRear': initialRear,
        'accelerationFront': accelerationFront,
        'accelerationRear': accelerationRear,
        'brakingFront': brakingFront,
        'brakingRear': brakingRear,
      };

  factory DifferentialSettings.fromJson(Map<String, dynamic> json) => DifferentialSettings(
        initialFront: _asInt(json['initialFront']),
        initialRear: _asInt(json['initialRear']),
        accelerationFront: _asInt(json['accelerationFront']),
        accelerationRear: _asInt(json['accelerationRear']),
        brakingFront: _asInt(json['brakingFront']),
        brakingRear: _asInt(json['brakingRear']),
      );
}

class GearingSettings {
  const GearingSettings({
    this.gearRatios = const [],
    this.finalGearRatio,
    this.topSpeedKmh,
  });

  /// Index 0 = 1st gear, index 1 = 2nd gear, etc.
  final List<double?> gearRatios;
  final double? finalGearRatio;
  final int? topSpeedKmh;

  Map<String, dynamic> toJson() => {
        'gearRatios': gearRatios,
        'finalGearRatio': finalGearRatio,
        'topSpeedKmh': topSpeedKmh,
      };

  factory GearingSettings.fromJson(Map<String, dynamic> json) => GearingSettings(
        gearRatios: ((json['gearRatios'] as List<dynamic>?) ?? const [])
            .map(_asDouble)
            .toList(),
        finalGearRatio: _asDouble(json['finalGearRatio']),
        topSpeedKmh: _asInt(json['topSpeedKmh']),
      );
}

class AeroSettings {
  const AeroSettings({this.downforceFront, this.downforceRear});

  final int? downforceFront;
  final int? downforceRear;

  Map<String, dynamic> toJson() => {
        'downforceFront': downforceFront,
        'downforceRear': downforceRear,
      };

  factory AeroSettings.fromJson(Map<String, dynamic> json) => AeroSettings(
        downforceFront: _asInt(json['downforceFront']),
        downforceRear: _asInt(json['downforceRear']),
      );
}

class BrakeSettings {
  const BrakeSettings({this.balanceFront, this.balanceRear});

  final int? balanceFront;
  final int? balanceRear;

  Map<String, dynamic> toJson() => {
        'balanceFront': balanceFront,
        'balanceRear': balanceRear,
      };

  factory BrakeSettings.fromJson(Map<String, dynamic> json) => BrakeSettings(
        balanceFront: _asInt(json['balanceFront']),
        balanceRear: _asInt(json['balanceRear']),
      );
}

class WeightSettings {
  const WeightSettings({
    this.ballastKg,
    this.ballastPosition,
    this.powerLimiterPercent,
  });

  final int? ballastKg;

  /// -50 (helemaal voor) tot 50 (helemaal achter).
  final int? ballastPosition;
  final int? powerLimiterPercent;

  Map<String, dynamic> toJson() => {
        'ballastKg': ballastKg,
        'ballastPosition': ballastPosition,
        'powerLimiterPercent': powerLimiterPercent,
      };

  factory WeightSettings.fromJson(Map<String, dynamic> json) => WeightSettings(
        ballastKg: _asInt(json['ballastKg']),
        ballastPosition: _asInt(json['ballastPosition']),
        powerLimiterPercent: _asInt(json['powerLimiterPercent']),
      );
}

enum TireCompound {
  comfortHard,
  comfortMedium,
  comfortSoft,
  sportsHard,
  sportsMedium,
  sportsSoft,
  racingHard,
  racingMedium,
  racingSoft,
  intermediate,
  wet,
}

extension TireCompoundLabel on TireCompound {
  String get label {
    switch (this) {
      case TireCompound.comfortHard:
        return 'Comfort Hard';
      case TireCompound.comfortMedium:
        return 'Comfort Medium';
      case TireCompound.comfortSoft:
        return 'Comfort Soft';
      case TireCompound.sportsHard:
        return 'Sports Hard';
      case TireCompound.sportsMedium:
        return 'Sports Medium';
      case TireCompound.sportsSoft:
        return 'Sports Soft';
      case TireCompound.racingHard:
        return 'Racing Hard';
      case TireCompound.racingMedium:
        return 'Racing Medium';
      case TireCompound.racingSoft:
        return 'Racing Soft';
      case TireCompound.intermediate:
        return 'Intermediate';
      case TireCompound.wet:
        return 'Wet';
    }
  }
}

class TireSettings {
  const TireSettings({this.compound, this.pressureFrontKpa, this.pressureRearKpa});

  final TireCompound? compound;
  final double? pressureFrontKpa;
  final double? pressureRearKpa;

  Map<String, dynamic> toJson() => {
        'compound': compound?.name,
        'pressureFrontKpa': pressureFrontKpa,
        'pressureRearKpa': pressureRearKpa,
      };

  factory TireSettings.fromJson(Map<String, dynamic> json) => TireSettings(
        compound: json['compound'] == null
            ? null
            : TireCompound.values.byName(json['compound'] as String),
        pressureFrontKpa: _asDouble(json['pressureFrontKpa']),
        pressureRearKpa: _asDouble(json['pressureRearKpa']),
      );
}
