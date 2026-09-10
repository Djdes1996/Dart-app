/**
 * De verbinding met de server.
 *
 * Valt de verbinding weg, dan proberen we het vanzelf opnieuw en melden we ons
 * met hetzelfde token, zodat je terugkomt in de wedstrijd die je aan het spelen
 * was in plaats van in een lege lobby.
 */

const OPSLAG_SLEUTEL = 'dartpunt';

/** Wachttijden voor een nieuwe poging, oplopend zodat we de server niet plagen. */
const WACHTTIJDEN_MS = [700, 1500, 3000, 5000, 8000];

/** Leest naam en token terug uit deze browser. */
export function leesOpslag() {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) ?? '{}');
  } catch {
    return {};
  }
}

/** Bewaart naam en token in deze browser. */
export function schrijfOpslag(waarden) {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify({ ...leesOpslag(), ...waarden }));
  } catch {
    // Zonder opslag werkt alles nog, je komt alleen niet vanzelf terug.
  }
}

export class Verbinding {
  /**
   * @param {object} opties
   * @param {(bericht: object) => void} opties.onBericht
   * @param {(status: string) => void} opties.onStatus 'verbonden' | 'weg' | 'zoeken'
   */
  constructor({ onBericht, onStatus }) {
    this.onBericht = onBericht;
    this.onStatus = onStatus;
    this.socket = null;
    this.pogingen = 0;
    this.dicht = false;
    this.wachtrij = [];
  }

  get adres() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/spel`;
  }

  open() {
    this.dicht = false;
    this.onStatus(this.pogingen === 0 ? 'zoeken' : 'weg');

    const socket = new WebSocket(this.adres);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.pogingen = 0;
      this.onStatus('verbonden');

      // Meteen weer aanmelden; de server weet ons dan terug te vinden.
      const { naam, token } = leesOpslag();
      if (naam) this.stuur({ type: 'hello', name: naam, token });

      for (const bericht of this.wachtrij.splice(0)) this.stuur(bericht);
    });

    socket.addEventListener('message', (gebeurtenis) => {
      let bericht;
      try {
        bericht = JSON.parse(gebeurtenis.data);
      } catch {
        return;
      }
      this.onBericht(bericht);
    });

    socket.addEventListener('close', () => {
      if (this.dicht) return;
      this.onStatus('weg');
      const wacht = WACHTTIJDEN_MS[Math.min(this.pogingen, WACHTTIJDEN_MS.length - 1)];
      this.pogingen += 1;
      setTimeout(() => this.open(), wacht);
    });

    socket.addEventListener('error', () => socket.close());
  }

  /** Stuurt een bericht, of bewaart het tot de verbinding er weer is. */
  stuur(bericht) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(bericht));
      return;
    }
    this.wachtrij.push(bericht);
  }

  sluit() {
    this.dicht = true;
    this.socket?.close();
  }
}
