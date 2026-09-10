/**
 * De lobby: spelers, kamers en het koppelen van tegenstanders.
 *
 * De server houdt de wedstrijd bij, niet de browser. Een client stuurt waar
 * zijn pijl landt; de server bepaalt wat dat waard is, of het jouw beurt wel
 * was, en wat de nieuwe stand is.
 */

import { randomUUID, randomInt } from 'node:crypto';
import { BOARD_RADIUS } from '../shared/board.js';
import { createMatch, applyThrow, publicState } from '../shared/match.js';

/** Tekens voor kamercodes; zonder O/0 en I/1, die lees je verkeerd voor. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Hoe lang een speler weg mag zijn voordat zijn plek vrijvalt. */
const RECONNECT_GRACE_MS = 60_000;

/**
 * Twee pijlen binnen deze tijd is niet menselijk; die weigeren we. Ruim onder
 * de tijd die de worpanimatie in de client kost, zodat een echte speler er
 * nooit tegenaan loopt.
 */
export const MIN_THROW_INTERVAL_MS = 150;

const MAX_NAME_LENGTH = 16;
const MAX_CHAT_LENGTH = 200;
const CHAT_HISTORY = 30;

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

const ALLOWED_START_SCORES = [301, 501];
const ALLOWED_LEGS_TO_WIN = [1, 2, 3, 5];

/** Haalt stuurtekens uit een naam en houdt hem kort. */
function cleanName(raw) {
  const text = String(raw ?? '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return text || `Gast${randomInt(100, 999)}`;
}

/** Leest de wedstrijdinstellingen uit, en valt terug op de standaard. */
function cleanOptions(raw) {
  const options = raw ?? {};
  const startScore = ALLOWED_START_SCORES.includes(options.startScore) ? options.startScore : 501;
  const legsToWin = ALLOWED_LEGS_TO_WIN.includes(options.legsToWin) ? options.legsToWin : 3;
  const doubleOut = options.doubleOut !== false;
  return { startScore, legsToWin, doubleOut };
}

/** Twee spelers passen alleen bij elkaar als ze hetzelfde spel willen. */
function optionsKey(options) {
  return `${options.startScore}|${options.legsToWin}|${options.doubleOut}`;
}

export class Lobby {
  constructor() {
    /** @type {Map<string, object>} spelers op id */
    this.clients = new Map();
    /** @type {Map<string, string>} herverbindingstoken naar spelerid */
    this.tokens = new Map();
    /** @type {Map<string, object>} kamers op code */
    this.rooms = new Map();
    /** @type {string[]} wachtrij voor snel spelen */
    this.queue = [];
  }

  // ---------------------------------------------------------------- spelers

  /** Neemt een nieuwe verbinding aan. */
  connect(socket) {
    const client = {
      id: randomUUID(),
      token: randomUUID(),
      name: null,
      socket,
      roomCode: null,
      wantedKey: null,
      lastThrowAt: 0,
      dropTimer: null,
    };
    this.clients.set(client.id, client);
    this.tokens.set(client.token, client.id);
    return client;
  }

  send(client, message) {
    if (!client?.socket || client.socket.readyState !== 1) return;
    client.socket.send(JSON.stringify(message));
  }

  fail(client, message) {
    this.send(client, { type: 'error', message });
  }

  /**
   * Verwerkt een binnengekomen bericht.
   * @param {object} client
   * @param {object} message al geparsed JSON
   * @returns {object|undefined} de speler die verder het verkeer afhandelt
   */
  handle(client, message) {
    const type = message?.type;
    switch (type) {
      case 'hello': return this.onHello(client, message);
      case 'quickPlay': return this.onQuickPlay(client, message);
      case 'createRoom': return this.onCreateRoom(client, message);
      case 'joinRoom': return this.onJoinRoom(client, message);
      case 'leave': return this.onLeave(client);
      case 'throw': return this.onThrow(client, message);
      case 'rematch': return this.onRematch(client);
      case 'chat': return this.onChat(client, message);
      case 'ping': return this.send(client, { type: 'pong' });
      default: return this.fail(client, `Onbekend bericht: ${type}`);
    }
  }

  /**
   * Eerste bericht: naam doorgeven, en eventueel terugkeren in een kamer.
   * Bij een geslaagde terugkeer leeft de speler verder onder zijn oude id, en
   * geeft deze functie dat oude record terug.
   */
  onHello(client, message) {
    const name = cleanName(message.name);

    if (message.token && this.tokens.has(message.token)) {
      const previous = this.clients.get(this.tokens.get(message.token));
      if (previous && previous.id !== client.id && !previous.socket) {
        return this.resume(client, previous, name);
      }
    }

    client.name = name;
    this.send(client, {
      type: 'welcome',
      clientId: client.id,
      token: client.token,
      name: client.name,
    });
    return client;
  }

  /** Zet een teruggekeerde speler weer op zijn oude plek. */
  resume(client, previous, name) {
    clearTimeout(previous.dropTimer);
    previous.dropTimer = null;

    // Het oude record leeft verder, maar met de nieuwe verbinding.
    previous.socket = client.socket;
    previous.name = name;
    this.clients.delete(client.id);
    this.tokens.delete(client.token);

    const room = this.rooms.get(previous.roomCode);
    if (room) {
      const seat = room.seats.find((each) => each.clientId === previous.id);
      if (seat) seat.name = name;
    }

    this.send(previous, {
      type: 'welcome',
      clientId: previous.id,
      token: previous.token,
      name: previous.name,
      resumed: true,
    });

    if (room) {
      this.broadcast(room, { type: 'opponentBack', name: previous.name }, previous.id);
      this.sendRoom(room);
    }
    return previous;
  }

  /** Ruimt een speler op als hij niet meer terugkomt. */
  disconnect(client) {
    if (!this.clients.has(client.id)) return;
    client.socket = null;

    this.removeFromQueue(client.id);

    const room = this.rooms.get(client.roomCode);
    if (!room) {
      this.forget(client);
      return;
    }

    this.broadcast(room, { type: 'opponentAway', name: client.name }, client.id);
    this.sendRoom(room);

    client.dropTimer = setTimeout(() => {
      this.leaveRoom(client);
      this.forget(client);
    }, RECONNECT_GRACE_MS);
    client.dropTimer.unref?.();
  }

  forget(client) {
    clearTimeout(client.dropTimer);
    this.clients.delete(client.id);
    this.tokens.delete(client.token);
  }

  // ---------------------------------------------------------------- kamers

  newCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    return randomUUID().slice(0, 8).toUpperCase();
  }

  createRoom(options, isPrivate) {
    const room = {
      code: this.newCode(),
      options,
      seats: [],
      match: null,
      rematchVotes: new Set(),
      chat: [],
      isPrivate,
    };
    this.rooms.set(room.code, room);
    return room;
  }

  seatOf(room, clientId) {
    return room.seats.findIndex((seat) => seat.clientId === clientId);
  }

  broadcast(room, message, exceptId = null) {
    for (const seat of room.seats) {
      if (seat.clientId === exceptId) continue;
      this.send(this.clients.get(seat.clientId), message);
    }
  }

  /** Stuurt iedereen in de kamer de huidige toestand. */
  sendRoom(room) {
    const players = room.seats.map((seat) => ({
      name: seat.name,
      connected: Boolean(this.clients.get(seat.clientId)?.socket),
    }));

    for (const seat of room.seats) {
      const client = this.clients.get(seat.clientId);
      if (!client) continue;
      this.send(client, {
        type: 'room',
        code: room.code,
        isPrivate: room.isPrivate,
        options: room.options,
        you: this.seatOf(room, seat.clientId),
        players,
        match: room.match ? publicState(room.match) : null,
        rematchVotes: room.rematchVotes.size,
      });
    }
  }

  join(client, room) {
    if (this.seatOf(room, client.id) !== -1) return true;
    if (room.seats.length >= 2) {
      this.fail(client, 'Die kamer zit vol');
      return false;
    }

    room.seats.push({ clientId: client.id, name: client.name });
    client.roomCode = room.code;

    if (room.chat.length) {
      this.send(client, { type: 'chatHistory', messages: room.chat });
    }

    if (room.seats.length === 2) this.startMatch(room);
    else this.sendRoom(room);
    return true;
  }

  leaveRoom(client) {
    const room = this.rooms.get(client.roomCode);
    client.roomCode = null;
    if (!room) return;

    const seat = this.seatOf(room, client.id);
    if (seat === -1) return;

    room.seats.splice(seat, 1);
    room.rematchVotes.clear();

    if (room.seats.length === 0) {
      this.rooms.delete(room.code);
      return;
    }

    // Met één speler kan de wedstrijd niet verder.
    room.match = null;
    this.broadcast(room, { type: 'opponentLeft', name: client.name });
    this.sendRoom(room);
  }

  onCreateRoom(client, message) {
    if (!client.name) return this.fail(client, 'Stel eerst een naam in');
    this.onLeave(client);
    const room = this.createRoom(cleanOptions(message.options), true);
    this.join(client, room);
  }

  onJoinRoom(client, message) {
    if (!client.name) return this.fail(client, 'Stel eerst een naam in');

    const code = String(message.code ?? '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return this.fail(client, `Geen kamer met code ${code || '(leeg)'}`);
    if (room.seats.length >= 2) return this.fail(client, 'Die kamer zit vol');

    this.onLeave(client);
    this.join(client, room);
  }

  onLeave(client) {
    this.removeFromQueue(client.id);
    if (client.roomCode) this.leaveRoom(client);
  }

  // ------------------------------------------------------------ snel spelen

  removeFromQueue(clientId) {
    const index = this.queue.indexOf(clientId);
    if (index !== -1) this.queue.splice(index, 1);
  }

  onQuickPlay(client, message) {
    if (!client.name) return this.fail(client, 'Stel eerst een naam in');
    this.onLeave(client);

    const options = cleanOptions(message.options);
    client.wantedKey = optionsKey(options);

    const waitingId = this.queue.find((id) => {
      const other = this.clients.get(id);
      return other && other.socket && other.wantedKey === client.wantedKey;
    });

    if (!waitingId) {
      this.queue.push(client.id);
      this.send(client, { type: 'queued', options });
      return;
    }

    this.removeFromQueue(waitingId);
    const opponent = this.clients.get(waitingId);
    const room = this.createRoom(options, false);
    this.join(opponent, room);
    this.join(client, room);
  }

  // --------------------------------------------------------------- wedstrijd

  startMatch(room) {
    room.rematchVotes.clear();
    room.match = createMatch({
      players: room.seats.map((seat) => ({ id: seat.clientId, name: seat.name })),
      ...room.options,
    });
    this.sendRoom(room);
    this.broadcast(room, { type: 'matchStart', match: publicState(room.match) });
  }

  onThrow(client, message) {
    const room = this.rooms.get(client.roomCode);
    if (!room?.match) return this.fail(client, 'Er loopt geen wedstrijd');
    if (room.match.status !== 'playing') return this.fail(client, 'De wedstrijd is afgelopen');

    const seat = this.seatOf(room, client.id);
    if (seat !== room.match.turn.player) return this.fail(client, 'Je bent niet aan de beurt');

    const { x, y } = message;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return this.fail(client, 'Ongeldige worp');
    }
    if (Math.hypot(x, y) > BOARD_RADIUS) {
      return this.fail(client, 'Die worp valt buiten het bord');
    }

    const now = Date.now();
    if (now - client.lastThrowAt < MIN_THROW_INTERVAL_MS) {
      return this.fail(client, 'Rustig aan');
    }
    client.lastThrowAt = now;

    const event = applyThrow(room.match, { x, y });
    if (event.matchWon) room.rematchVotes.clear();

    this.broadcast(room, {
      type: 'throw',
      event,
      match: publicState(room.match),
    });
  }

  onRematch(client) {
    const room = this.rooms.get(client.roomCode);
    if (!room) return this.fail(client, 'Je zit niet in een kamer');
    if (room.match && room.match.status !== 'finished') {
      return this.fail(client, 'De wedstrijd loopt nog');
    }
    if (room.seats.length < 2) return this.fail(client, 'Wacht op een tegenstander');

    room.rematchVotes.add(client.id);
    if (room.rematchVotes.size >= room.seats.length) {
      this.startMatch(room);
      return;
    }

    this.broadcast(room, { type: 'rematchWanted', name: client.name }, client.id);
    this.sendRoom(room);
  }

  onChat(client, message) {
    const room = this.rooms.get(client.roomCode);
    if (!room) return;

    const text = String(message.text ?? '')
      .replace(CONTROL_CHARS, ' ')
      .trim()
      .slice(0, MAX_CHAT_LENGTH);
    if (!text) return;

    const entry = { from: client.name, text, at: Date.now() };
    room.chat.push(entry);
    if (room.chat.length > CHAT_HISTORY) room.chat.shift();

    this.broadcast(room, { type: 'chat', ...entry });
  }

  /** Cijfers voor de statuspagina. */
  stats() {
    return {
      players: this.clients.size,
      rooms: this.rooms.size,
      waiting: this.queue.length,
      matches: [...this.rooms.values()].filter((room) => room.match?.status === 'playing').length,
    };
  }
}
