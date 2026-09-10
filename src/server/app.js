/**
 * De server in elkaar zetten: statische bestanden, statuspagina en de
 * WebSocket-verbindingen waarover de wedstrijden lopen.
 *
 * Het starten zelf gebeurt in index.js, zodat de tests een server op een eigen
 * poort kunnen opzetten en weer afbreken.
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

import { Lobby } from './lobby.js';
import { createStaticHandler } from './static.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..');

/** Het pad waarop de client zijn WebSocket opent. */
export const GAME_PATH = '/spel';

/** Dood gewaande verbindingen opruimen. */
const HEARTBEAT_MS = 30_000;

/** Een bericht groter dan dit is geen zet meer maar een aanval. */
const MAX_MESSAGE_BYTES = 8 * 1024;

/**
 * Zet een complete server op, maar laat hem nog niet luisteren.
 * @returns {{server: http.Server, wss: WebSocketServer, lobby: Lobby, close: () => Promise<void>}}
 */
export function createApp() {
  const lobby = new Lobby();

  const serveStatic = createStaticHandler([
    // De client gebruikt letterlijk dezelfde regelmodules als de server.
    { prefix: '/shared/', root: path.join(projectRoot, 'src', 'shared') },
    { prefix: '/', root: path.join(projectRoot, 'public') },
  ]);

  const server = http.createServer(async (req, res) => {
    if (req.url.split('?')[0] === '/status') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(lobby.stats()));
      return;
    }
    await serveStatic(req, res);
  });

  const wss = new WebSocketServer({ server, path: GAME_PATH, maxPayload: MAX_MESSAGE_BYTES });

  wss.on('connection', (socket) => {
    let client = lobby.connect(socket);
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        lobby.fail(client, 'Onleesbaar bericht');
        return;
      }

      try {
        // Bij een geslaagde terugkeer gaat de speler verder onder zijn oude
        // record; vanaf dan hoort deze verbinding daarbij.
        const result = lobby.handle(client, message);
        if (result?.id && result.id !== client.id) client = result;
      } catch (error) {
        console.error('Fout bij het verwerken van een bericht:', error);
        lobby.fail(client, 'Daar ging iets mis');
      }
    });

    socket.on('close', () => lobby.disconnect(client));
    socket.on('error', () => lobby.disconnect(client));
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  /** Sluit alles af en wacht tot de poort echt vrij is. */
  function close() {
    clearInterval(heartbeat);
    for (const client of lobby.clients.values()) clearTimeout(client.dropTimer);
    for (const socket of wss.clients) socket.terminate();
    return new Promise((resolve) => {
      wss.close(() => server.close(() => resolve()));
    });
  }

  return { server, wss, lobby, close };
}
