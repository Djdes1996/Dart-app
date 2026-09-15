# GT7 Tuning Companion

Mobiele companion-app voor Gran Turismo 7-spelers om tuning-setups lokaal op
te slaan, te bekijken en te bewerken. Geen account, geen backend — alle data
blijft op je eigen toestel.

## Features

- Setups aanmaken, bewerken en verwijderen per auto
- Overzicht van alle opgeslagen setups, met zoeken op automodel
- Gedetailleerde velden per categorie:
  - **Banden**: compound, bandenspanning voor/achter
  - **Ophanging**: rijhoogte, stabistangen, eigenfrequentie, demping
    (compressie/extensie), camber, toe — voor/achter
  - **Differentieel (LSD)**: initieel, acceleratie, remmen — voor/achter
  - **Versnellingsbak**: individuele overbrengingen (tot 8 versnellingen),
    eindoverbrenging, topsnelheid
  - **Aerodynamica**: downforce voor/achter
  - **Remmen**: balans voor/achter
  - **Gewicht & vermogen**: ballast, ballastpositie, vermogensbegrenzer
- Vrij notitieveld per setup (bijv. rij-indrukken)
- Alles optioneel: vul alleen in wat voor jouw auto/onderdelen van
  toepassing is

Alle setups worden als één JSON-bestand in de lokale app-opslag bewaard
(geen internetverbinding of account nodig).

## Aan de slag

Vereist: de [Flutter SDK](https://docs.flutter.dev/get-started/install)
(stable channel).

```bash
flutter pub get
flutter run
```

## Tests

```bash
flutter test
```

Dekt JSON-(de)serialisatie van een tuning-setup, opslaan/laden via de lokale
JSON-repository, en een smoke test die het scherm-flow (lijst → nieuwe setup
→ opslaan → terug in lijst) doorloopt.

## Architectuur

- `lib/models` — `TuningSetup` en bijbehorende deel-instellingen (pure Dart,
  geen Flutter-afhankelijkheid, dus los te testen)
- `lib/data` — `SetupRepository`: leest/schrijft setups als JSON-bestand op
  lokale opslag (directory wordt van buitenaf meegegeven, ook zonder
  Flutter-plugins te testen)
- `lib/state` — `SetupStore`: in-memory state + CRUD, beschikbaar in de
  widget-boom via `provider`
- `lib/screens` — lijstscherm, detailscherm en formulier (aanmaken/bewerken)

## Status

Eerste versie, gericht op het opslaan en beheren van tuning-setups. Mogelijke
uitbreidingen: garage/auto-collectie, race-/tijdregistratie, setups delen.
