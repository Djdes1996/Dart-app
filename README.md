# Dartpunt

Online darts tegen een echte tegenstander, in de geest van de spelletjessites
van vroeger. 501 of 301, drie pijlen per beurt, dubbel uit.

Geen account, geen installatie: je typt een naam, klikt op **Snel spelen** en
zodra iemand anders hetzelfde spel wil begint het.

## Draaien

```bash
npm install
npm start
```

Daarna staat het op <http://localhost:3000>. Wil je zelf tegen jezelf spelen,
open dan een tweede venster (een privévenster werkt het beste, want elke
browser onthoudt maar één speler).

Poort en adres zijn in te stellen:

```bash
PORT=8080 HOST=127.0.0.1 npm start
```

## Spelen

**Richten** gaat in twee klikken, zoals in de oude spelletjes. Eerst schuift er
een verticale lijn heen en weer: klik om je richting vast te zetten. Dan doet
een horizontale lijn hetzelfde: klik om te gooien. De spatiebalk werkt ook.

Op je worp zit een klein beetje trilling, dus mikken op de triple 20 is geen
garantie dat je hem raakt. Naast het bord staat het uitgooiadvies zodra je
onder de 171 komt.

**Samen spelen** kan op twee manieren:

- **Snel spelen** zet je in de wachtrij en koppelt je aan de eerste speler die
  dezelfde instellingen kiest.
- **Kamer maken** geeft je een code van vier tekens. Geef die door, en wie hem
  invult bij **Meedoen** komt bij jou binnen.

**Verbinding kwijt?** Je plek blijft een minuut lang bewaard. Kom je binnen die
tijd terug, ook na het herladen van de pagina, dan speel je verder op dezelfde
stand.

## Hoe het in elkaar zit

```
src/shared/    de regels, gebruikt door server en browser
  board.js       trefpunt in millimeters -> segment en score
  checkout.js    uitgooiadvies
  match.js       beurten, bust, dubbel uit, legs
src/server/
  app.js         server in elkaar zetten
  index.js       starten
  lobby.js       spelers, kamers, koppelen, wedstrijd bewaken
  static.js      bestanden uitserveren
public/          de client
test/            tests
```

De map `src/shared/` wordt ook uitgeserveerd onder `/shared/`, zodat de browser
letterlijk dezelfde modules draait als de server. Eén plek voor de regels, geen
twee versies die uit elkaar kunnen lopen.

### De server houdt de stand bij

De browser rekent niets uit wat telt. Hij stuurt waar de pijl landt, en de
server bepaalt de rest: of het jouw beurt wel was, wat het segment waard is, of
je bust bent, en wie de leg wint. Beide spelers krijgen daarna dezelfde stand
teruggestuurd.

Wat de server **niet** kan controleren is of dat trefpunt eerlijk tot stand
kwam — dat komt uit de richtanimatie in de browser. Wie zin heeft om te
knoeien, kan met een eigen script precies op de triple 20 mikken. Voor een
potje tegen een vriend is dat prima; voor een ranglijst met prijzen zou je het
richten naar de server moeten verhuizen. De server bewaakt wel de dingen die
een spelletje kapotmaken: gooien buiten je beurt, worpen buiten het bord, en
een stortvloed aan berichten.

### Statuspagina

`GET /status` geeft in JSON hoeveel spelers online zijn, hoeveel kamers er zijn
en hoeveel wedstrijden er lopen. De lobby laat dat onderaan zien.

## Tests

```bash
npm test
```

Dit dekt de scoring op het bord, de uitgooiadviezen, de wedstrijdregels, en een
volledige wedstrijd over echte WebSockets: koppelen, gooien buiten je beurt,
bust, een leg uitgooien, revanche en herverbinden.

## Herkomst

Dit is een eigen eerbetoon aan de Nederlandse spelletjessites van vroeger, en
aan het darts dat daar op stond. Er is geen band met GamePoint of Spelpunt; de
naam, de vormgeving en alle code hier zijn nieuw.
