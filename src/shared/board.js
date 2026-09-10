/**
 * Dartbord-geometrie en scoring.
 *
 * Alle afmetingen in millimeters, gemeten vanaf het midden van het bord, zodat
 * ze overeenkomen met een echt wedstrijdbord. De client tekent hetzelfde bord
 * geschaald naar pixels, maar de server rekent altijd in millimeters.
 */

/** Nummers met de klok mee, beginnend bij de 20 bovenaan. */
export const SECTORS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

/** Straal van elke ring, in millimeter. */
export const RADII = {
  bull: 6.35,        // roos, 50 punten
  outerBull: 15.9,   // ring om de roos, 25 punten
  tripleInner: 99,
  tripleOuter: 107,
  doubleInner: 162,
  doubleOuter: 170,  // buitenrand van het scorende vlak
};

/** Straal van het hele bordvlak, inclusief de rand buiten de dubbels. */
export const BOARD_RADIUS = 225;

/** Een sector is 360/20 graden breed; de 20 ligt gecentreerd bovenaan. */
export const SECTOR_ANGLE = (Math.PI * 2) / SECTORS.length;

/**
 * Bepaalt in welke sector een hoek valt.
 * @param {number} x millimeter naar rechts vanaf het midden
 * @param {number} y millimeter omhoog vanaf het midden
 * @returns {number} index in SECTORS
 */
function sectorIndexAt(x, y) {
  // atan2(x, y) is 0 recht naar boven en loopt met de klok mee op.
  let angle = Math.atan2(x, y);
  if (angle < 0) angle += Math.PI * 2;
  // Een halve sector opschuiven zodat de 20 gecentreerd ligt in plaats van
  // dat zijn linkerrand op 0 graden valt.
  const shifted = angle + SECTOR_ANGLE / 2;
  return Math.floor(shifted / SECTOR_ANGLE) % SECTORS.length;
}

/**
 * Zet een trefpunt om in een score.
 * @param {number} x millimeter naar rechts vanaf het midden
 * @param {number} y millimeter omhoog vanaf het midden
 * @returns {{sector: number, ring: string, value: number, label: string}}
 */
export function scoreAt(x, y) {
  const radius = Math.hypot(x, y);

  if (radius <= RADII.bull) {
    return { sector: 25, ring: 'bull', value: 50, label: 'BULL' };
  }
  if (radius <= RADII.outerBull) {
    return { sector: 25, ring: 'outerBull', value: 25, label: '25' };
  }
  if (radius > RADII.doubleOuter) {
    return { sector: 0, ring: 'miss', value: 0, label: 'MIS' };
  }

  const sector = SECTORS[sectorIndexAt(x, y)];

  if (radius >= RADII.tripleInner && radius <= RADII.tripleOuter) {
    return { sector, ring: 'triple', value: sector * 3, label: `T${sector}` };
  }
  if (radius >= RADII.doubleInner) {
    return { sector, ring: 'double', value: sector * 2, label: `D${sector}` };
  }
  return { sector, ring: 'single', value: sector, label: String(sector) };
}

/** Het midden van de dubbelring van een nummer, in millimeter. */
export function doubleCenterRadius() {
  return (RADII.doubleInner + RADII.doubleOuter) / 2;
}

/** Het midden van de triplering van een nummer, in millimeter. */
export function tripleCenterRadius() {
  return (RADII.tripleInner + RADII.tripleOuter) / 2;
}

/**
 * Het punt waar je moet mikken voor een bepaald doel, bijvoorbeeld 'T20',
 * 'D16', '19' of 'BULL'. Gebruikt door de computer-tegenstander en de tests.
 * @param {string} target
 * @returns {{x: number, y: number}}
 */
export function targetPoint(target) {
  const label = String(target).toUpperCase().trim();

  if (label === 'BULL' || label === '50') return { x: 0, y: 0 };
  if (label === '25') return { x: 0, y: (RADII.bull + RADII.outerBull) / 2 };

  const match = /^([DT]?)(\d{1,2})$/.exec(label);
  if (!match) throw new Error(`Onbekend doel: ${target}`);

  const [, prefix, numberText] = match;
  const number = Number(numberText);
  const index = SECTORS.indexOf(number);
  if (index === -1) throw new Error(`Geen sector met nummer ${number}`);

  let radius;
  if (prefix === 'D') radius = doubleCenterRadius();
  else if (prefix === 'T') radius = tripleCenterRadius();
  else radius = (RADII.tripleOuter + RADII.doubleInner) / 2; // buitenste enkel

  const angle = index * SECTOR_ANGLE;
  return { x: Math.sin(angle) * radius, y: Math.cos(angle) * radius };
}
