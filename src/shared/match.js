/**
 * De wedstrijd: beurten van drie pijlen, bust-regels, dubbel uit en legs.
 *
 * De server is hier de baas. De client mag dit ook draaien om het scorebord
 * alvast bij te werken, maar wat de server zegt telt.
 */

import { scoreAt } from './board.js';
import { checkoutSuggestion } from './checkout.js';

export const DARTS_PER_TURN = 3;

/**
 * @param {object} options
 * @param {Array<{id: string, name: string}>} options.players
 * @param {number} [options.startScore] 501 of 301
 * @param {number} [options.legsToWin]
 * @param {boolean} [options.doubleOut]
 */
export function createMatch({ players, startScore = 501, legsToWin = 3, doubleOut = true }) {
  if (!Array.isArray(players) || players.length < 2) {
    throw new Error('Een wedstrijd heeft minstens twee spelers nodig');
  }

  return {
    startScore,
    legsToWin,
    doubleOut,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      score: startScore,
      legsWon: 0,
      dartsThrown: 0,
      pointsScored: 0,
      highestTurn: 0,
      maximums: 0, // aantal keer 180
    })),
    turn: { player: 0, darts: [], startScore },
    legNumber: 1,
    legStarter: 0,
    status: 'playing',
    winner: null,
  };
}

/** Het gemiddelde per drie pijlen, zoals op een echt scorebord. */
export function averageFor(player) {
  if (player.dartsThrown === 0) return 0;
  return (player.pointsScored / player.dartsThrown) * DARTS_PER_TURN;
}

/** Het uitgooiadvies voor de speler die nu aan de beurt is. */
export function suggestionFor(state) {
  if (state.status !== 'playing') return null;
  const player = state.players[state.turn.player];
  const dartsLeft = DARTS_PER_TURN - state.turn.darts.length;
  return checkoutSuggestion(player.score, dartsLeft, state.doubleOut);
}

/** Rondt de beurt af: punten bijschrijven en doorgeven aan de volgende speler. */
function finishTurn(state, { busted }) {
  const player = state.players[state.turn.player];

  if (!busted) {
    const scoredThisTurn = state.turn.startScore - player.score;
    player.pointsScored += scoredThisTurn;
    if (scoredThisTurn > player.highestTurn) player.highestTurn = scoredThisTurn;
    if (scoredThisTurn === 180) player.maximums += 1;
  }

  const next = (state.turn.player + 1) % state.players.length;
  state.turn = { player: next, darts: [], startScore: state.players[next].score };
}

/** Zet een nieuwe leg klaar; de andere speler mag beginnen. */
function startNextLeg(state) {
  state.legNumber += 1;
  state.legStarter = (state.legStarter + 1) % state.players.length;
  for (const player of state.players) player.score = state.startScore;
  state.turn = { player: state.legStarter, darts: [], startScore: state.startScore };
}

/**
 * Verwerkt één worp.
 * @param {object} state wedstrijdstatus, wordt bijgewerkt
 * @param {{x: number, y: number}} hit trefpunt in millimeter vanaf het midden
 * @returns {object} wat er met deze pijl gebeurde
 */
export function applyThrow(state, { x, y }) {
  if (state.status !== 'playing') {
    throw new Error('De wedstrijd is al afgelopen');
  }

  const dart = scoreAt(x, y);
  const player = state.players[state.turn.player];
  const thrower = state.turn.player;

  state.turn.darts.push({ ...dart, x, y });
  player.dartsThrown += 1;

  const remaining = player.score - dart.value;
  const finishedOnDouble = dart.ring === 'double' || dart.ring === 'bull';

  let busted = false;
  let legWon = false;

  if (remaining < 0) {
    busted = true;
  } else if (remaining === 0) {
    if (state.doubleOut && !finishedOnDouble) busted = true;
    else legWon = true;
  } else if (remaining === 1 && state.doubleOut) {
    // Vanaf 1 punt kun je niet meer op een dubbel eindigen.
    busted = true;
  }

  if (busted) {
    player.score = state.turn.startScore;
  } else {
    player.score = remaining;
  }

  const turnTotal = state.turn.startScore - player.score;
  const dartsUsed = state.turn.darts.length;
  const turnEnded = busted || legWon || dartsUsed >= DARTS_PER_TURN;

  const event = {
    player: thrower,
    dart: { ...dart, x, y },
    busted,
    legWon: false,
    matchWon: false,
    turnEnded,
    remaining: player.score,
    turnTotal: busted ? 0 : turnTotal,
    dartsUsed,
  };

  if (legWon) {
    // Een gewonnen leg telt gewoon mee voor het gemiddelde.
    player.pointsScored += turnTotal;
    if (turnTotal > player.highestTurn) player.highestTurn = turnTotal;

    player.legsWon += 1;
    event.legWon = true;

    if (player.legsWon >= state.legsToWin) {
      state.status = 'finished';
      state.winner = thrower;
      event.matchWon = true;
      state.turn = { player: thrower, darts: [], startScore: 0 };
    } else {
      startNextLeg(state);
    }
    return event;
  }

  if (turnEnded) finishTurn(state, { busted });
  return event;
}

/** De status zoals de clients hem te zien krijgen. */
export function publicState(state) {
  return {
    startScore: state.startScore,
    legsToWin: state.legsToWin,
    doubleOut: state.doubleOut,
    legNumber: state.legNumber,
    status: state.status,
    winner: state.winner,
    turn: {
      player: state.turn.player,
      darts: state.turn.darts,
      dartsLeft: DARTS_PER_TURN - state.turn.darts.length,
    },
    suggestion: suggestionFor(state),
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      legsWon: player.legsWon,
      dartsThrown: player.dartsThrown,
      highestTurn: player.highestTurn,
      maximums: player.maximums,
      average: Number(averageFor(player).toFixed(2)),
    })),
  };
}
