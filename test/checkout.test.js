import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSuggestion } from '../src/shared/checkout.js';

test('de klassieke uitgooien', () => {
  assert.deepEqual(checkoutSuggestion(170), ['T20', 'T20', 'BULL']);
  assert.deepEqual(checkoutSuggestion(167), ['T20', 'T19', 'BULL']);
  assert.deepEqual(checkoutSuggestion(141), ['T20', 'T19', 'D12']);
  assert.deepEqual(checkoutSuggestion(100), ['T20', 'D20']);
  assert.deepEqual(checkoutSuggestion(40), ['D20']);
  assert.deepEqual(checkoutSuggestion(32), ['D16']);
  assert.deepEqual(checkoutSuggestion(50), ['BULL']);
});

test('boven 170 en op 1 kun je niet uitgooien', () => {
  assert.equal(checkoutSuggestion(171), null);
  assert.equal(checkoutSuggestion(501), null);
  assert.equal(checkoutSuggestion(1), null);
});

test('169, 168, 166, 165, 163, 162 en 159 kunnen niet in drie pijlen', () => {
  for (const score of [169, 168, 166, 165, 163, 162, 159]) {
    assert.equal(checkoutSuggestion(score), null, `${score} zou geen uitgooi moeten hebben`);
  }
});

test('het advies past bij het aantal pijlen dat nog over is', () => {
  assert.deepEqual(checkoutSuggestion(40, 1), ['D20']);
  assert.equal(checkoutSuggestion(100, 1), null);
  assert.deepEqual(checkoutSuggestion(100, 2), ['T20', 'D20']);
});

test('elk advies telt precies op tot de stand en eindigt op een dubbel', () => {
  const values = new Map();
  for (let n = 1; n <= 20; n++) {
    values.set(String(n), n);
    values.set(`D${n}`, n * 2);
    values.set(`T${n}`, n * 3);
  }
  values.set('BULL', 50);
  values.set('25', 25);

  for (let score = 2; score <= 170; score++) {
    const route = checkoutSuggestion(score);
    if (!route) continue;
    const total = route.reduce((sum, label) => sum + values.get(label), 0);
    assert.equal(total, score, `${score} telt niet op`);
    const last = route.at(-1);
    assert.ok(last.startsWith('D') || last === 'BULL', `${score} eindigt niet op een dubbel`);
  }
});
