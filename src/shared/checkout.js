/**
 * Uitgooi-adviezen: welke pijlen gooi je om precies op nul te eindigen?
 *
 * De volgorde van de kandidaatlijsten bepaalt welk advies je krijgt. Ze staan
 * op spelersvoorkeur, zodat 141 het vertrouwde "T20 T19 D12" oplevert en niet
 * een even geldige maar onspeelbare route.
 */

/** Pijlen om mee af te maken; de roos telt als dubbel 25. */
const FINISH_DARTS = [
  ['D20', 40], ['D16', 32], ['D18', 36], ['D12', 24], ['D10', 20],
  ['D8', 16], ['D14', 28], ['D6', 12], ['D4', 8], ['D2', 4],
  ['BULL', 50], ['D19', 38], ['D17', 34], ['D15', 30], ['D13', 26],
  ['D11', 22], ['D9', 18], ['D7', 14], ['D5', 10], ['D3', 6], ['D1', 2],
];

/** Pijlen om mee op te bouwen, van hoog scorend naar laag. */
const SETUP_DARTS = (() => {
  const darts = [];
  for (let n = 20; n >= 1; n--) darts.push([`T${n}`, n * 3]);
  for (let n = 20; n >= 1; n--) darts.push([String(n), n]);
  darts.push(['BULL', 50], ['25', 25]);
  for (let n = 20; n >= 1; n--) darts.push([`D${n}`, n * 2]);
  return darts;
})();

/** De hoogste score die je nog in drie pijlen kunt uitgooien. */
export const MAX_CHECKOUT = 170;

/**
 * Zoekt een uitgooiroute van precies `darts` pijlen.
 * @returns {string[]|null}
 */
function findRoute(score, darts, doubleOut) {
  if (darts === 1) {
    const candidates = doubleOut ? FINISH_DARTS : [...FINISH_DARTS, ...SETUP_DARTS];
    for (const [label, value] of candidates) {
      if (value === score) return [label];
    }
    return null;
  }

  for (const [label, value] of SETUP_DARTS) {
    const remaining = score - value;
    // Onder de 2 blijven kan niet: met dubbel uit is 1 een dood punt.
    if (remaining < (doubleOut ? 2 : 1)) continue;
    const rest = findRoute(remaining, darts - 1, doubleOut);
    if (rest) return [label, ...rest];
  }
  return null;
}

/**
 * Het kortste uitgooiadvies voor een stand, of null als het niet kan.
 * @param {number} score resterende punten
 * @param {number} dartsLeft pijlen die deze beurt nog over zijn
 * @param {boolean} doubleOut of er op een dubbel geëindigd moet worden
 * @returns {string[]|null} bijvoorbeeld ['T20', 'T19', 'D12']
 */
export function checkoutSuggestion(score, dartsLeft = 3, doubleOut = true) {
  if (score > MAX_CHECKOUT || score < 2) return null;
  if (dartsLeft < 1) return null;

  // Kortste route eerst: met 40 punten en drie pijlen wil je D20 zien, niet
  // een omweg van drie pijlen die toevallig ook uitkomt.
  for (let darts = 1; darts <= dartsLeft; darts++) {
    const route = findRoute(score, darts, doubleOut);
    if (route) return route;
  }
  return null;
}
