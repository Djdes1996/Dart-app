/**
 * Het dartbord tekenen en richten.
 *
 * Richten gaat zoals in de spelletjes van vroeger: eerst schuift een verticale
 * lijn heen en weer, je klikt om je horizontale positie vast te zetten, daarna
 * doet een horizontale lijn hetzelfde. Waar ze elkaar kruisen komt je pijl,
 * met een klein beetje trilling erbij zodat het nooit helemaal zeker is.
 */

import { SECTORS, RADII, BOARD_RADIUS, SECTOR_ANGLE } from '/shared/board.js';

/** Hoe lang de lijn erover doet om één keer over te steken. */
const SWEEP_MS = 1150;

/** Zover reikt de richtlijn; iets buiten het bord, zodat je ook kunt missen. */
const AIM_RANGE = RADII.doubleOuter + 12;

/** Trilling op de worp, in millimeter. Zonder dit voelt het als een rekensom. */
const WOBBLE_MM = 4.2;

const KLEUREN = {
  buitenrand: '#0f1512',
  rand: '#2b2320',
  zwart: '#191512',
  room: '#e6d5a8',
  rood: '#c8102e',
  groen: '#00843d',
  draad: '#9aa0a6',
  cijfer: '#f3ead2',
};

/** Twee willekeurige getallen met een normale verdeling. */
function trilling(spreiding) {
  const u = Math.random() || 1e-9;
  const v = Math.random();
  const lengte = Math.sqrt(-2 * Math.log(u)) * spreiding;
  return { x: lengte * Math.cos(2 * Math.PI * v), y: lengte * Math.sin(2 * Math.PI * v) };
}

/** Driehoeksgolf van 0 naar 1 en terug; gelijkmatig, anders is het niet eerlijk. */
function heenEnWeer(verstreken) {
  const fase = (verstreken / SWEEP_MS) % 2;
  return fase < 1 ? fase : 2 - fase;
}

/** Een taartpunt tussen twee stralen. */
function taartpunt(ctx, cx, cy, binnen, buiten, van, tot) {
  ctx.beginPath();
  ctx.arc(cx, cy, buiten, van, tot);
  ctx.arc(cx, cy, binnen, tot, van, true);
  ctx.closePath();
}

export class DartBord {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    /** @type {Array<{x: number, y: number, label: string}>} pijlen in het bord */
    this.darts = [];

    /** 'uit' | 'x' | 'y' | 'wachten' */
    this.fase = 'uit';
    this.startTijd = 0;
    this.gekozenX = 0;
    this.laatsteX = 0;
    this.laatsteY = 0;

    this.schaal = 1;
    this.midden = { x: 0, y: 0 };

    this.pasAan();
    window.addEventListener('resize', () => this.pasAan());
  }

  /** Zet de canvasgrootte gelijk aan wat het scherm laat zien. */
  pasAan() {
    const dpr = window.devicePixelRatio || 1;
    const breedte = this.canvas.clientWidth || 560;
    this.canvas.width = Math.round(breedte * dpr);
    this.canvas.height = Math.round(breedte * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.midden = { x: breedte / 2, y: breedte / 2 };
    this.schaal = (breedte / 2) / BOARD_RADIUS;
  }

  /** Millimeter op het bord naar een punt op het scherm. */
  naarScherm(x, y) {
    return {
      x: this.midden.x + x * this.schaal,
      y: this.midden.y - y * this.schaal,
    };
  }

  // ------------------------------------------------------------------ richten

  /** Begint een nieuwe worp: de verticale lijn gaat lopen. */
  begin() {
    this.fase = 'x';
    this.startTijd = performance.now();
  }

  /** Zet het richten stil, bijvoorbeeld als de beurt voorbij is. */
  stop() {
    this.fase = 'uit';
  }

  get richt() {
    return this.fase === 'x' || this.fase === 'y';
  }

  /**
   * Een klik: eerst de horizontale positie vastzetten, dan de verticale.
   * @returns {{x: number, y: number}|null} de worp, zodra beide vastliggen
   */
  klik() {
    if (this.fase === 'x') {
      this.gekozenX = this.laatsteX;
      this.fase = 'y';
      this.startTijd = performance.now();
      return null;
    }

    if (this.fase === 'y') {
      const beving = trilling(WOBBLE_MM);
      this.fase = 'wachten';
      return {
        x: this.gekozenX + beving.x,
        y: this.laatsteY + beving.y,
      };
    }

    return null;
  }

  // ------------------------------------------------------------------ tekenen

  /** Tekent alles opnieuw. Wordt elke beeldwissel aangeroepen. */
  teken(nu = performance.now()) {
    const { ctx } = this;
    const breedte = this.canvas.clientWidth || 560;

    ctx.clearRect(0, 0, breedte, breedte);
    this.tekenBord();
    this.tekenPijlen();

    if (this.richt) {
      const positie = (heenEnWeer(nu - this.startTijd) * 2 - 1) * AIM_RANGE;
      if (this.fase === 'x') this.laatsteX = positie;
      else this.laatsteY = positie;
      this.tekenRichtlijnen();
    }
  }

  tekenBord() {
    const { ctx, midden } = this;
    const straal = (mm) => mm * this.schaal;

    // De rand om het speelvlak.
    ctx.fillStyle = KLEUREN.buitenrand;
    ctx.beginPath();
    ctx.arc(midden.x, midden.y, straal(BOARD_RADIUS), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = KLEUREN.rand;
    ctx.beginPath();
    ctx.arc(midden.x, midden.y, straal(BOARD_RADIUS - 8), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = KLEUREN.zwart;
    ctx.beginPath();
    ctx.arc(midden.x, midden.y, straal(RADII.doubleOuter), 0, Math.PI * 2);
    ctx.fill();

    const half = SECTOR_ANGLE / 2;

    for (let index = 0; index < SECTORS.length; index++) {
      // Op het scherm ligt hoek 0 rechts, terwijl de 20 bovenaan staat.
      const hart = index * SECTOR_ANGLE - Math.PI / 2;
      const van = hart - half;
      const tot = hart + half;

      const donker = index % 2 === 0;
      const vlak = donker ? KLEUREN.zwart : KLEUREN.room;
      const ring = donker ? KLEUREN.rood : KLEUREN.groen;

      ctx.fillStyle = vlak;
      taartpunt(ctx, midden.x, midden.y, straal(RADII.outerBull), straal(RADII.tripleInner), van, tot);
      ctx.fill();
      taartpunt(ctx, midden.x, midden.y, straal(RADII.tripleOuter), straal(RADII.doubleInner), van, tot);
      ctx.fill();

      ctx.fillStyle = ring;
      taartpunt(ctx, midden.x, midden.y, straal(RADII.tripleInner), straal(RADII.tripleOuter), van, tot);
      ctx.fill();
      taartpunt(ctx, midden.x, midden.y, straal(RADII.doubleInner), straal(RADII.doubleOuter), van, tot);
      ctx.fill();
    }

    // De roos.
    ctx.fillStyle = KLEUREN.groen;
    ctx.beginPath();
    ctx.arc(midden.x, midden.y, straal(RADII.outerBull), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = KLEUREN.rood;
    ctx.beginPath();
    ctx.arc(midden.x, midden.y, straal(RADII.bull), 0, Math.PI * 2);
    ctx.fill();

    this.tekenDraden();
    this.tekenCijfers();
  }

  /** De metalen draden tussen de vakken. */
  tekenDraden() {
    const { ctx, midden } = this;
    const straal = (mm) => mm * this.schaal;

    ctx.strokeStyle = KLEUREN.draad;
    ctx.lineWidth = Math.max(1, this.schaal * 1.1);

    for (let index = 0; index < SECTORS.length; index++) {
      const hoek = index * SECTOR_ANGLE - Math.PI / 2 - SECTOR_ANGLE / 2;
      ctx.beginPath();
      ctx.moveTo(
        midden.x + Math.cos(hoek) * straal(RADII.outerBull),
        midden.y + Math.sin(hoek) * straal(RADII.outerBull),
      );
      ctx.lineTo(
        midden.x + Math.cos(hoek) * straal(RADII.doubleOuter),
        midden.y + Math.sin(hoek) * straal(RADII.doubleOuter),
      );
      ctx.stroke();
    }

    for (const mm of [RADII.bull, RADII.outerBull, RADII.tripleInner, RADII.tripleOuter,
      RADII.doubleInner, RADII.doubleOuter]) {
      ctx.beginPath();
      ctx.arc(midden.x, midden.y, straal(mm), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** De nummers rondom, rechtop zodat je ze kunt lezen. */
  tekenCijfers() {
    const { ctx, midden } = this;
    const straal = (BOARD_RADIUS - 20) * this.schaal;
    const grootte = Math.max(10, Math.round(15 * this.schaal * 1.4));

    ctx.fillStyle = KLEUREN.cijfer;
    ctx.font = `700 ${grootte}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    SECTORS.forEach((nummer, index) => {
      const hoek = index * SECTOR_ANGLE - Math.PI / 2;
      ctx.fillText(
        String(nummer),
        midden.x + Math.cos(hoek) * straal,
        midden.y + Math.sin(hoek) * straal,
      );
    });
  }

  /** De pijlen die deze beurt al in het bord staan. */
  tekenPijlen() {
    const { ctx } = this;

    this.darts.forEach((dart, index) => {
      const punt = this.naarScherm(dart.x, dart.y);
      const laatste = index === this.darts.length - 1;
      const maat = Math.max(3, 5 * this.schaal);

      // Een staartje, zodat het op een pijl lijkt en niet op een stip.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = Math.max(2, 2.4 * this.schaal);
      ctx.beginPath();
      ctx.moveTo(punt.x, punt.y);
      ctx.lineTo(punt.x + maat * 2.6, punt.y - maat * 2.6);
      ctx.stroke();

      ctx.strokeStyle = laatste ? '#ffd54a' : '#f0f0f0';
      ctx.lineWidth = Math.max(1.5, 1.8 * this.schaal);
      ctx.beginPath();
      ctx.moveTo(punt.x + maat * 1.2, punt.y - maat * 1.2);
      ctx.lineTo(punt.x + maat * 2.6, punt.y - maat * 2.6);
      ctx.stroke();

      ctx.fillStyle = laatste ? '#ffd54a' : '#e8e8e8';
      ctx.beginPath();
      ctx.arc(punt.x, punt.y, maat * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  /** De lijnen waarmee je richt. */
  tekenRichtlijnen() {
    const { ctx } = this;
    const breedte = this.canvas.clientWidth || 560;

    const tekenLijn = (positie, verticaal, actief) => {
      const punt = verticaal ? this.naarScherm(positie, 0) : this.naarScherm(0, positie);
      ctx.strokeStyle = actief ? 'rgba(255, 213, 74, 0.95)' : 'rgba(255, 213, 74, 0.45)';
      ctx.lineWidth = actief ? 3 : 2;
      ctx.setLineDash(actief ? [] : [7, 7]);
      // Een gloed eromheen, anders valt de lijn weg in de donkere vakken.
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (verticaal) {
        ctx.moveTo(punt.x, 0);
        ctx.lineTo(punt.x, breedte);
      } else {
        ctx.moveTo(0, punt.y);
        ctx.lineTo(breedte, punt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    };

    if (this.fase === 'x') {
      tekenLijn(this.laatsteX, true, true);
      return;
    }

    tekenLijn(this.gekozenX, true, false);
    tekenLijn(this.laatsteY, false, true);

    const kruis = this.naarScherm(this.gekozenX, this.laatsteY);
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(kruis.x, kruis.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}
