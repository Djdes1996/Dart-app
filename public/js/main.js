/**
 * De client: schermen, scorebord en het gooien zelf.
 *
 * Alles wat telt komt van de server. Deze code laat het zien en stuurt door
 * waar jouw pijl landt; de stand die je op het bord ziet is de stand die de
 * server heeft doorgegeven.
 */

import { DartBord } from './board.js';
import { Verbinding, leesOpslag, schrijfOpslag } from './net.js';

const el = (id) => document.getElementById(id);

/** Hoe lang een gegooide beurt blijft staan voordat het bord leeg gaat. */
const BEURT_PAUZE_MS = 1600;

const schermen = {
  naam: el('scherm-naam'),
  lobby: el('scherm-lobby'),
  wachten: el('scherm-wachten'),
  spel: el('scherm-spel'),
};

const bord = new DartBord(el('bord'));

let kamer = null;
let match = null;
let jij = 0;
let mijnBeurt = false;
let meldingTimer = null;
let opruimTimer = null;
let cijfersTimer = null;

// ---------------------------------------------------------------- hulpjes

/** Maakt een element; tekst gaat altijd via textContent, nooit via HTML. */
function maak(tag, klasse, tekst) {
  const knoop = document.createElement(tag);
  if (klasse) knoop.className = klasse;
  if (tekst !== undefined) knoop.textContent = tekst;
  return knoop;
}

/** Telwoord met het juiste enkel- of meervoud erachter. */
function meervoud(aantal, enkel, meer) {
  return `${aantal} ${aantal === 1 ? enkel : meer}`;
}

function toonScherm(naam) {
  for (const [sleutel, knoop] of Object.entries(schermen)) {
    knoop.hidden = sleutel !== naam;
  }
  if (naam === 'lobby') startCijfers();
  else stopCijfers();
}

/** Een korte melding over het bord, zoals de score van je pijl. */
function toonMelding(tekst, soort = '') {
  const knoop = el('bord-melding');
  knoop.textContent = tekst;
  knoop.className = `bord-melding ${soort}`.trim();
  knoop.hidden = false;

  clearTimeout(meldingTimer);
  meldingTimer = setTimeout(() => {
    knoop.hidden = true;
  }, 1400);
}

/** Een regel in het praatvenster. */
function zegIets(tekst, van = null) {
  const lijst = el('praat-lijst');
  const regel = maak('li', van ? 'praat-regel' : 'praat-regel praat-systeem');

  if (van) {
    regel.append(maak('span', 'praat-van', `${van}: `), maak('span', null, tekst));
  } else {
    regel.textContent = tekst;
  }

  lijst.append(regel);
  while (lijst.children.length > 60) lijst.firstChild.remove();
  lijst.scrollTop = lijst.scrollHeight;
}

// ---------------------------------------------------------------- verbinding

const verbinding = new Verbinding({
  onBericht: verwerk,
  onStatus: (status) => {
    const knoop = el('verbinding');
    if (status === 'verbonden') {
      knoop.hidden = true;
      return;
    }
    knoop.hidden = false;
    knoop.textContent = status === 'zoeken'
      ? 'Verbinding maken…'
      : 'Verbinding weg. We proberen het opnieuw…';
  },
});

function verwerk(bericht) {
  switch (bericht.type) {
    case 'welcome': return opWelkom(bericht);
    case 'queued': return opWachtrij();
    case 'room': return opKamer(bericht);
    case 'matchStart': return opStart(bericht);
    case 'throw': return opWorp(bericht);
    case 'chat': return zegIets(bericht.text, bericht.from);
    case 'chatHistory': return bericht.messages.forEach((m) => zegIets(m.text, m.from));
    case 'opponentAway': return zegIets(`${bericht.name} is even weg…`);
    case 'opponentBack': return zegIets(`${bericht.name} is er weer.`);
    case 'opponentLeft': return opVertrek(bericht);
    case 'rematchWanted': return opRevancheVraag(bericht);
    case 'error': return toonFout(bericht.message);
    default: return undefined;
  }
}

function toonFout(tekst) {
  zegIets(tekst);
  if (!schermen.spel.hidden) toonMelding(tekst, 'melding-fout');
  else el('wachten-uitleg').textContent = tekst;
}

// ------------------------------------------------------------------ schermen

function opWelkom(bericht) {
  schrijfOpslag({ naam: bericht.name, token: bericht.token });
  el('lobby-naam').textContent = bericht.name;
  el('naam-invoer').value = bericht.name;

  // Bij een terugkeer stuurt de server zo de kamer na; dan niet naar de lobby.
  if (!bericht.resumed) toonScherm('lobby');
}

function opWachtrij() {
  el('wachten-titel').textContent = 'Zoeken naar een tegenstander…';
  el('wachten-code').hidden = true;
  el('wachten-uitleg').textContent = 'Zodra iemand hetzelfde spel wil, begint het meteen.';
  toonScherm('wachten');
}

function opKamer(bericht) {
  kamer = bericht;
  jij = bericht.you;

  if (bericht.match) {
    match = bericht.match;
    bord.darts = match.turn.darts.slice();
    toonScherm('spel');
    tekenSpel();
    regelBeurt();
    return;
  }

  match = null;
  el('wachten-titel').textContent = 'Wachten op een tegenstander';
  el('wachten-code').hidden = false;
  el('wachten-code').textContent = bericht.code;
  el('wachten-uitleg').textContent = 'Geef deze code door; wie hem invult komt bij jou binnen.';
  toonScherm('wachten');
}

function opStart(bericht) {
  match = bericht.match;
  bord.darts = [];
  el('sluier').hidden = true;
  el('einde-wacht').hidden = true;
  clearTimeout(opruimTimer);

  toonScherm('spel');
  tekenSpel();
  regelBeurt();
  zegIets(`Nieuwe wedstrijd: ${match.startScore}, wie het eerst `
    + `${meervoud(match.legsToWin, 'leg', 'legs')} wint.`);
}

function opVertrek(bericht) {
  zegIets(`${bericht.name} heeft de wedstrijd verlaten.`);
  match = null;
  bord.stop();
  el('sluier').hidden = true;
}

function opRevancheVraag(bericht) {
  zegIets(`${bericht.name} wil een revanche.`);
  el('einde-wacht').hidden = false;
  el('einde-wacht').textContent = `${bericht.name} wacht op jou.`;
}

// -------------------------------------------------------------------- het spel

/** Bepaalt of jij mag gooien en zet het richten aan of uit. */
function regelBeurt() {
  mijnBeurt = Boolean(match) && match.status === 'playing' && match.turn.player === jij;

  if (mijnBeurt) bord.begin();
  else bord.stop();

  tekenBeurt();
}

function tekenBeurt() {
  const knoop = el('beurt');
  knoop.className = 'beurt';

  if (!match) {
    knoop.textContent = 'Wachten op een tegenstander…';
    return;
  }
  if (match.status === 'finished') {
    knoop.textContent = match.winner === jij ? 'Gewonnen!' : 'Verloren.';
    return;
  }

  // Wie aan zet is komt van de server; of je al mag klikken hangt ervan af of
  // de vorige beurt al is opgeruimd.
  const aanZet = match.turn.player;

  if (aanZet !== jij) {
    knoop.textContent = `${match.players[aanZet].name} is aan de beurt…`;
    return;
  }

  knoop.classList.add('beurt-jij');
  if (!bord.richt) knoop.textContent = 'Jouw beurt';
  else if (bord.fase === 'x') knoop.textContent = 'Klik om je richting vast te zetten';
  else knoop.textContent = 'Klik om te gooien';
}

/** Het hele spelscherm opnieuw opbouwen. */
function tekenSpel() {
  tekenScorebord();
  tekenPijlenrij();
  tekenAdvies();
  tekenBeurt();
}

function tekenScorebord() {
  const bordknoop = el('scorebord');
  bordknoop.replaceChildren();
  if (!match) return;

  match.players.forEach((speler, index) => {
    const kaart = maak('div', 'speler');
    if (match.status === 'playing' && match.turn.player === index) kaart.classList.add('speler-beurt');
    if (index === jij) kaart.classList.add('speler-jij');

    const kop = maak('div', 'speler-kop');
    kop.append(maak('span', 'speler-naam', speler.name));
    if (index === jij) kop.append(maak('span', 'speler-merk', 'jij'));

    const legs = maak('div', 'speler-legs');
    for (let n = 0; n < match.legsToWin; n++) {
      legs.append(maak('span', n < speler.legsWon ? 'leg leg-vol' : 'leg'));
    }

    kaart.append(
      kop,
      maak('div', 'speler-score', String(speler.score)),
      legs,
      maak('div', 'speler-info', `gem. ${speler.average.toFixed(1)} · hoogste ${speler.highestTurn}`),
    );
    bordknoop.append(kaart);
  });
}

function tekenPijlenrij() {
  const rij = el('pijlen');
  rij.replaceChildren();
  if (!match) return;

  const gegooid = match.turn.darts;
  for (let n = 0; n < 3; n++) {
    const vak = maak('span', 'pijl', gegooid[n]?.label ?? '·');
    if (gegooid[n]) vak.classList.add('pijl-vol');
    rij.append(vak);
  }
}

function tekenAdvies() {
  const knoop = el('advies');
  knoop.replaceChildren();
  if (!match || match.status !== 'playing' || !mijnBeurt || !match.suggestion) return;

  knoop.append(maak('span', 'advies-kop', 'Uitgooi:'));
  for (const doel of match.suggestion) knoop.append(maak('span', 'advies-doel', doel));
}

function opWorp(bericht) {
  const { event, match: nieuw } = bericht;
  match = nieuw;

  bord.darts.push(event.dart);

  if (event.busted) toonMelding('BUST!', 'melding-bust');
  else if (event.legWon) toonMelding(event.matchWon ? 'GEWONNEN!' : 'LEG!', 'melding-leg');
  else if (event.turnEnded) toonMelding(String(event.turnTotal), 'melding-totaal');
  else toonMelding(event.dart.label);

  tekenSpel();

  if (event.matchWon) {
    bord.stop();
    mijnBeurt = false;
    opruimTimer = setTimeout(toonEinde, BEURT_PAUZE_MS);
    return;
  }

  if (event.turnEnded) {
    // De pijlen blijven nog even staan, zodat je ziet wat er gegooid is.
    bord.stop();
    mijnBeurt = false;
    tekenBeurt();
    opruimTimer = setTimeout(() => {
      bord.darts = [];
      tekenSpel();
      regelBeurt();
    }, BEURT_PAUZE_MS);
    return;
  }

  regelBeurt();
}

function toonEinde() {
  const gewonnen = match.winner === jij;
  el('einde-titel').textContent = gewonnen ? 'Gewonnen!' : 'Verloren';

  const ik = match.players[jij];
  const winnaar = match.players[match.winner];
  el('einde-tekst').textContent =
    `${winnaar.name} wint met ${meervoud(winnaar.legsWon, 'leg', 'legs')}. ` +
    `Jouw gemiddelde: ${ik.average.toFixed(1)} over ${meervoud(ik.dartsThrown, 'pijl', 'pijlen')}.`;

  el('einde-wacht').hidden = true;
  el('sluier').hidden = false;
}

/** Een klik of een druk op de spatiebalk: richten en gooien. */
function gooi() {
  if (!mijnBeurt || !bord.richt) return;

  const worp = bord.klik();
  tekenBeurt();
  if (!worp) return;

  mijnBeurt = false;
  verbinding.stuur({ type: 'throw', x: worp.x, y: worp.y });
}

// ------------------------------------------------------------------- cijfers

function startCijfers() {
  const haal = async () => {
    try {
      const antwoord = await fetch('/status');
      const cijfers = await antwoord.json();
      el('lobby-cijfers').textContent =
        `${meervoud(cijfers.players, 'speler', 'spelers')} online · ` +
        `${meervoud(cijfers.matches, 'wedstrijd', 'wedstrijden')} bezig`;
    } catch {
      el('lobby-cijfers').textContent = '';
    }
  };
  haal();
  stopCijfers();
  cijfersTimer = setInterval(haal, 5000);
}

function stopCijfers() {
  clearInterval(cijfersTimer);
  cijfersTimer = null;
}

// -------------------------------------------------------------------- knoppen

function huidigeOpties() {
  return {
    startScore: Number(el('optie-score').value),
    legsToWin: Number(el('optie-legs').value),
    doubleOut: el('optie-dubbel').checked,
  };
}

el('naam-formulier').addEventListener('submit', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  const naam = el('naam-invoer').value.trim();
  if (!naam) return;
  schrijfOpslag({ naam });
  verbinding.stuur({ type: 'hello', name: naam, token: leesOpslag().token });
});

el('knop-snel').addEventListener('click', () => {
  verbinding.stuur({ type: 'quickPlay', options: huidigeOpties() });
});

el('knop-kamer').addEventListener('click', () => {
  verbinding.stuur({ type: 'createRoom', options: huidigeOpties() });
});

el('meedoen-formulier').addEventListener('submit', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  const code = el('code-invoer').value.trim().toUpperCase();
  if (!code) return;
  verbinding.stuur({ type: 'joinRoom', code });
});

el('knop-annuleren').addEventListener('click', () => {
  verbinding.stuur({ type: 'leave' });
  toonScherm('lobby');
});

el('knop-weg').addEventListener('click', () => {
  verbinding.stuur({ type: 'leave' });
  match = null;
  bord.stop();
  el('sluier').hidden = true;
  toonScherm('lobby');
});

el('knop-revanche').addEventListener('click', () => {
  verbinding.stuur({ type: 'rematch' });
  el('einde-wacht').hidden = false;
  el('einde-wacht').textContent = 'Wachten op je tegenstander…';
});

el('knop-lobby').addEventListener('click', () => {
  verbinding.stuur({ type: 'leave' });
  match = null;
  el('sluier').hidden = true;
  toonScherm('lobby');
});

el('praat-formulier').addEventListener('submit', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  const tekst = el('praat-invoer').value.trim();
  if (!tekst) return;
  verbinding.stuur({ type: 'chat', text: tekst });
  el('praat-invoer').value = '';
});

el('bord').addEventListener('pointerdown', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  gooi();
});

document.addEventListener('keydown', (gebeurtenis) => {
  if (gebeurtenis.code !== 'Space' && gebeurtenis.key !== ' ') return;
  if (gebeurtenis.target instanceof HTMLInputElement) return;
  gebeurtenis.preventDefault();
  gooi();
});

// ------------------------------------------------------------------- opstarten

function beeldwissel(nu) {
  bord.teken(nu);
  requestAnimationFrame(beeldwissel);
}

const opgeslagen = leesOpslag();
if (opgeslagen.naam) {
  el('naam-invoer').value = opgeslagen.naam;
  el('lobby-naam').textContent = opgeslagen.naam;
}

toonScherm(opgeslagen.naam ? 'lobby' : 'naam');
verbinding.open();
requestAnimationFrame(beeldwissel);
