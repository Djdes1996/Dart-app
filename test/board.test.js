import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAt, targetPoint, SECTORS, RADII } from '../src/shared/board.js';

test('de roos en de ring eromheen', () => {
  assert.equal(scoreAt(0, 0).value, 50);
  assert.equal(scoreAt(0, 0).label, 'BULL');
  assert.equal(scoreAt(0, 10).value, 25);
  assert.equal(scoreAt(10, 0).value, 25);
});

test('buiten het bord is een misser', () => {
  assert.equal(scoreAt(0, RADII.doubleOuter + 1).value, 0);
  assert.equal(scoreAt(300, 300).label, 'MIS');
});

test('de 20 ligt bovenaan en de 3 onderaan', () => {
  assert.equal(scoreAt(0, 120).sector, 20);
  assert.equal(scoreAt(0, -120).sector, 3);
});

test('de 6 ligt rechts en de 11 links', () => {
  assert.equal(scoreAt(120, 0).sector, 6);
  assert.equal(scoreAt(-120, 0).sector, 11);
});

test('elk nummer levert zijn enkel, dubbel en triple op', () => {
  for (const number of SECTORS) {
    const single = targetPoint(String(number));
    const double = targetPoint(`D${number}`);
    const triple = targetPoint(`T${number}`);

    assert.deepEqual(
      [scoreAt(single.x, single.y).value, scoreAt(single.x, single.y).ring],
      [number, 'single'],
      `enkel ${number}`,
    );
    assert.equal(scoreAt(double.x, double.y).value, number * 2, `dubbel ${number}`);
    assert.equal(scoreAt(triple.x, triple.y).value, number * 3, `triple ${number}`);
  }
});

test('elke sector is even breed en ze dekken het hele bord', () => {
  const seen = new Map();
  const radius = 120;
  for (let step = 0; step < 3600; step++) {
    // Een half stapje ernaast, anders valt een monster precies op een
    // sectorgrens en is het toeval aan welke kant het landt.
    const angle = ((step + 0.5) / 10) * (Math.PI / 180);
    const hit = scoreAt(Math.sin(angle) * radius, Math.cos(angle) * radius);
    seen.set(hit.sector, (seen.get(hit.sector) ?? 0) + 1);
  }
  assert.equal(seen.size, 20);
  for (const [sector, count] of seen) {
    assert.equal(count, 180, `sector ${sector} is niet even breed`);
  }
});
