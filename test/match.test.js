import test from 'node:test';
import assert from 'node:assert/strict';
import { targetPoint } from '../src/shared/board.js';
import { createMatch, applyThrow, publicState, averageFor } from '../src/shared/match.js';

const twoPlayers = [
  { id: 'a', name: 'Jan' },
  { id: 'b', name: 'Piet' },
];

/** Gooit op een genoemd doel, bijvoorbeeld 'T20' of 'D16'. */
function gooi(state, target) {
  return applyThrow(state, targetPoint(target));
}

/** Gooit een hele beurt en geeft de laatste gebeurtenis terug. */
function beurt(state, ...targets) {
  let last;
  for (const target of targets) last = gooi(state, target);
  return last;
}

test('een beurt van drie pijlen gaat naar de tegenstander', () => {
  const state = createMatch({ players: twoPlayers });
  const event = beurt(state, 'T20', 'T20', 'T20');

  assert.equal(event.turnTotal, 180);
  assert.equal(event.turnEnded, true);
  assert.equal(state.players[0].score, 321);
  assert.equal(state.players[0].maximums, 1);
  assert.equal(state.turn.player, 1, 'nu is de tegenstander aan de beurt');
});

test('over nul gooien is bust en de stand gaat terug', () => {
  const state = createMatch({ players: twoPlayers, startScore: 101 });
  gooi(state, 'T20'); // 41 over
  const event = gooi(state, 'T20'); // zou -19 worden

  assert.equal(event.busted, true);
  assert.equal(event.turnEnded, true);
  assert.equal(state.players[0].score, 101, 'de stand van voor de beurt');
  assert.equal(state.turn.player, 1);
});

test('op 1 blijven staan is bust, want daar kun je niet op een dubbel eindigen', () => {
  const state = createMatch({ players: twoPlayers, startScore: 21 });
  const event = gooi(state, '20'); // laat 1 over

  assert.equal(event.busted, true);
  assert.equal(state.players[0].score, 21);
});

test('precies nul halen zonder dubbel is bust', () => {
  const state = createMatch({ players: twoPlayers, startScore: 20 });
  const event = gooi(state, '20');

  assert.equal(event.busted, true);
  assert.equal(event.legWon, false);
  assert.equal(state.players[0].score, 20);
});

test('op een dubbel eindigen wint de leg', () => {
  const state = createMatch({ players: twoPlayers, startScore: 40 });
  const event = gooi(state, 'D20');

  assert.equal(event.legWon, true);
  assert.equal(event.matchWon, false);
  assert.equal(state.players[0].legsWon, 1);
  assert.equal(state.legNumber, 2);
});

test('de roos telt als dubbel om mee uit te gooien', () => {
  const state = createMatch({ players: twoPlayers, startScore: 50 });
  const event = gooi(state, 'BULL');

  assert.equal(event.legWon, true);
});

test('na een leg staan beide spelers weer op de beginstand en begint de ander', () => {
  const state = createMatch({ players: twoPlayers, startScore: 40, legsToWin: 3 });
  gooi(state, 'D20');

  assert.equal(state.players[0].score, 40);
  assert.equal(state.players[1].score, 40);
  assert.equal(state.turn.player, 1, 'de tegenstander begint de tweede leg');

  gooi(state, 'D20');
  assert.equal(state.players[1].legsWon, 1);
  assert.equal(state.turn.player, 0, 'en daarna is speler één weer aan zet');
});

test('genoeg legs winnen wint de wedstrijd', () => {
  const state = createMatch({ players: twoPlayers, startScore: 40, legsToWin: 2 });

  gooi(state, 'D20');           // speler 0 wint leg 1
  beurt(state, '1', '1', '1');  // speler 1 knoeit
  gooi(state, 'D20');           // speler 0 wint leg 2

  assert.equal(state.status, 'finished');
  assert.equal(state.winner, 0);
  assert.equal(state.players[0].legsWon, 2);
  assert.throws(() => gooi(state, 'T20'), /afgelopen/);
});

test('een bust telt niet mee voor de punten, de pijlen wel', () => {
  const state = createMatch({ players: twoPlayers, startScore: 101 });
  beurt(state, 'T20', 'T20'); // bust op de tweede pijl

  const player = state.players[0];
  assert.equal(player.pointsScored, 0);
  assert.equal(player.dartsThrown, 2);
  assert.equal(averageFor(player), 0);
});

test('het gemiddelde is per drie pijlen', () => {
  const state = createMatch({ players: twoPlayers });
  beurt(state, 'T20', 'T20', 'T20'); // 180 met drie pijlen

  assert.equal(averageFor(state.players[0]), 180);
  assert.equal(publicState(state).players[0].average, 180);
});

test('de status voor de clients bevat het uitgooiadvies', () => {
  const state = createMatch({ players: twoPlayers, startScore: 141 });
  const view = publicState(state);

  assert.deepEqual(view.suggestion, ['T20', 'T19', 'D12']);
  assert.equal(view.turn.dartsLeft, 3);
  assert.equal(view.players[0].name, 'Jan');
});

test('zonder dubbel uit mag je op elke pijl eindigen', () => {
  const state = createMatch({ players: twoPlayers, startScore: 20, doubleOut: false });
  const event = gooi(state, '20');

  assert.equal(event.legWon, true);
});
