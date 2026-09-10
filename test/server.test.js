import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

import { createApp, GAME_PATH } from '../src/server/app.js';
import { MIN_THROW_INTERVAL_MS } from '../src/server/lobby.js';
import { targetPoint } from '../src/shared/board.js';

const WACHTTIJD_MS = 3000;

/** Start een server op een vrije poort. */
async function startServer() {
  const app = createApp();
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  return { app, port: app.server.address().port };
}

/**
 * Een testspeler: stuurt berichten en laat je wachten op wat er terugkomt.
 */
function makeClient(port) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${GAME_PATH}`);
  const inbox = new Map();   // berichttype -> ontvangen berichten
  const waiting = new Map(); // berichttype -> wachtende resolvers

  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    const queue = waiting.get(message.type);
    if (queue?.length) {
      queue.shift()(message);
      return;
    }
    if (!inbox.has(message.type)) inbox.set(message.type, []);
    inbox.get(message.type).push(message);
  });

  return {
    socket,
    ready: new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    }),

    send(message) {
      socket.send(JSON.stringify(message));
    },

    /** Wacht op het eerstvolgende bericht van een bepaald type. */
    waitFor(type) {
      const queue = inbox.get(type);
      if (queue?.length) return Promise.resolve(queue.shift());

      return new Promise((resolve, reject) => {
        if (!waiting.has(type)) waiting.set(type, []);
        waiting.get(type).push(resolve);
        const timer = setTimeout(
          () => reject(new Error(`Geen '${type}' ontvangen binnen ${WACHTTIJD_MS}ms`)),
          WACHTTIJD_MS,
        );
        timer.unref();
      });
    },

    /** Kijkt of er al een bericht van dit type binnen is, zonder te wachten. */
    peek(type) {
      return inbox.get(type)?.[0] ?? null;
    },

    close() {
      socket.close();
    },
  };
}

/** Meldt zich aan en wacht op de bevestiging. */
async function login(port, name) {
  const client = makeClient(port);
  await client.ready;
  client.send({ type: 'hello', name });
  const welcome = await client.waitFor('welcome');
  client.token = welcome.token;
  client.id = welcome.clientId;
  return client;
}

/** Kort wachten, voor dingen die geen bericht opleveren. */
const even = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gooit één pijl en wacht tot beide spelers het resultaat binnen hebben.
 * Houdt de worplimiet van de server aan, net als de echte client doet met
 * zijn worpanimatie.
 */
async function gooi(werper, ander, target) {
  await even(MIN_THROW_INTERVAL_MS + 20);
  werper.send({ type: 'throw', ...targetPoint(target) });
  const [resultaat] = await Promise.all([werper.waitFor('throw'), ander.waitFor('throw')]);
  return resultaat;
}

/** Speelt een leg van 301 uit: Jan gooit 180, Piet knoeit, Jan gooit 121 uit. */
async function speelLegUit(jan, piet) {
  for (const target of ['T20', 'T20', 'T20']) await gooi(jan, piet, target);
  for (const target of ['1', '1', '1']) await gooi(piet, jan, target);
  for (const target of ['T20', 'T11']) await gooi(jan, piet, target);
  return gooi(jan, piet, 'D14');
}

test('twee spelers vinden elkaar met snel spelen', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');

  jan.send({ type: 'quickPlay', options: { startScore: 501, legsToWin: 3 } });
  await jan.waitFor('queued');

  piet.send({ type: 'quickPlay', options: { startScore: 501, legsToWin: 3 } });

  const [startJan, startPiet] = await Promise.all([
    jan.waitFor('matchStart'),
    piet.waitFor('matchStart'),
  ]);

  assert.equal(startJan.match.players.length, 2);
  assert.equal(startJan.match.startScore, 501);
  assert.deepEqual(
    startPiet.match.players.map((player) => player.name),
    ['Jan', 'Piet'],
  );
});

test('spelers met verschillende instellingen worden niet gekoppeld', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');

  jan.send({ type: 'quickPlay', options: { startScore: 501, legsToWin: 3 } });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay', options: { startScore: 301, legsToWin: 3 } });
  await piet.waitFor('queued');

  await even(150);
  assert.equal(jan.peek('matchStart'), null, 'Jan zou nog moeten wachten');
  assert.equal(app.lobby.stats().waiting, 2);
});

test('een privékamer met een code', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');

  jan.send({ type: 'createRoom', options: { startScore: 301, legsToWin: 1 } });
  const room = await jan.waitFor('room');

  assert.match(room.code, /^[A-Z0-9]{4}$/);
  assert.equal(room.players.length, 1);
  assert.equal(room.match, null, 'nog geen wedstrijd met één speler');

  piet.send({ type: 'joinRoom', code: room.code.toLowerCase() });
  const start = await piet.waitFor('matchStart');
  assert.equal(start.match.startScore, 301);
});

test('een onbekende kamercode geeft een nette melding', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  jan.send({ type: 'joinRoom', code: 'ZZZZ' });

  const error = await jan.waitFor('error');
  assert.match(error.message, /Geen kamer/);
});

test('gooien terwijl je niet aan de beurt bent wordt geweigerd', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay' });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay' });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  // Jan begint, dus Piet mag nog niet.
  piet.send({ type: 'throw', ...targetPoint('T20') });
  const error = await piet.waitFor('error');
  assert.match(error.message, /niet aan de beurt/);
});

test('onzin-worpen worden geweigerd', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay' });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay' });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  jan.send({ type: 'throw', x: 'T20', y: null });
  assert.match((await jan.waitFor('error')).message, /Ongeldige worp/);

  jan.send({ type: 'throw', x: 5000, y: 5000 });
  assert.match((await jan.waitFor('error')).message, /buiten het bord/);

  // De stand mag er niet door veranderd zijn.
  await even(MIN_THROW_INTERVAL_MS + 20);
  jan.send({ type: 'throw', ...targetPoint('T20') });
  const thrown = await jan.waitFor('throw');
  assert.equal(thrown.match.players[0].score, 501 - 60);
});

test('een volledige leg wordt door de server bijgehouden', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay', options: { startScore: 301, legsToWin: 1 } });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay', options: { startScore: 301, legsToWin: 1 } });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);


  // 301 -> 141 in één beurt van Jan.
  await gooi(jan, piet, 'T20');
  await gooi(jan, piet, 'T20');
  const derde = await gooi(jan, piet, 'T20');
  assert.equal(derde.match.players[0].score, 121);
  assert.equal(derde.event.turnTotal, 180);
  assert.equal(derde.match.turn.player, 1, 'nu is Piet aan zet');

  // Piet doet een beurt van niks.
  await gooi(piet, jan, '1');
  await gooi(piet, jan, '1');
  await gooi(piet, jan, '1');

  // Jan gooit 121 uit: T20 T11 D14.
  await gooi(jan, piet, 'T20');
  await gooi(jan, piet, 'T11');
  const uit = await gooi(jan, piet, 'D14');

  assert.equal(uit.event.legWon, true);
  assert.equal(uit.event.matchWon, true);
  assert.equal(uit.match.status, 'finished');
  assert.equal(uit.match.winner, 0);
  assert.equal(uit.match.players[0].maximums, 1);
});

test('na de wedstrijd start een revanche pas als beiden willen', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay', options: { startScore: 301, legsToWin: 1 } });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay', options: { startScore: 301, legsToWin: 1 } });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  await speelLegUit(jan, piet);

  jan.send({ type: 'rematch' });
  await piet.waitFor('rematchWanted');
  await even(80);
  assert.equal(jan.peek('matchStart'), null, 'nog geen nieuwe wedstrijd');

  piet.send({ type: 'rematch' });
  const opnieuw = await jan.waitFor('matchStart');
  assert.equal(opnieuw.match.status, 'playing');
  assert.equal(opnieuw.match.players[0].score, 301);
});

test('wie wegvalt kan terugkomen en speelt verder', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay' });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay' });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  jan.send({ type: 'throw', ...targetPoint('T20') });
  await Promise.all([jan.waitFor('throw'), piet.waitFor('throw')]);

  const token = jan.token;
  jan.close();
  await piet.waitFor('opponentAway');

  const terug = makeClient(port);
  await terug.ready;
  terug.send({ type: 'hello', name: 'Jan', token });

  const welcome = await terug.waitFor('welcome');
  assert.equal(welcome.resumed, true);
  await piet.waitFor('opponentBack');

  const room = await terug.waitFor('room');
  assert.equal(room.match.players[0].score, 441, 'de stand van voor het wegvallen');
  assert.equal(room.you, 0);

  // En hij mag gewoon verder gooien.
  await even(MIN_THROW_INTERVAL_MS + 20);
  terug.send({ type: 'throw', ...targetPoint('T20') });
  const verder = await terug.waitFor('throw');
  assert.equal(verder.match.players[0].score, 381);
});

test('als de tegenstander definitief weggaat stopt de wedstrijd', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay' });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay' });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  piet.send({ type: 'leave' });
  const bericht = await jan.waitFor('opponentLeft');
  assert.equal(bericht.name, 'Piet');

  const room = await jan.waitFor('room');
  assert.equal(room.match, null);
  assert.equal(room.players.length, 1);
});

test('praten in de kamer komt aan bij de ander', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  const piet = await login(port, 'Piet');
  jan.send({ type: 'quickPlay' });
  await jan.waitFor('queued');
  piet.send({ type: 'quickPlay' });
  await Promise.all([jan.waitFor('matchStart'), piet.waitFor('matchStart')]);

  jan.send({ type: 'chat', text: 'Goed gegooid!' });
  const bericht = await piet.waitFor('chat');
  assert.equal(bericht.from, 'Jan');
  assert.equal(bericht.text, 'Goed gegooid!');
});

test('een onbekend bericht krijgt een nette foutmelding', async (t) => {
  const { app, port } = await startServer();
  t.after(() => app.close());

  const jan = await login(port, 'Jan');
  jan.send({ type: 'raketten-afvuren' });
  assert.match((await jan.waitFor('error')).message, /Onbekend bericht/);

  jan.socket.send('dit is geen json');
  assert.match((await jan.waitFor('error')).message, /Onleesbaar/);
});
