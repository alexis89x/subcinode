import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSync, stringifySync } from 'subtitle';
import { insertPromoSub, PROMO_TEXT } from '../src/promo.js';

function buildSrt(intervals) {
  const nodes = intervals.map(([start, end], i) => ({
    type: 'cue',
    data: { start, end, text: `Line ${i + 1}` }
  }));
  return stringifySync(nodes, { format: 'srt' });
}

function cues(srt) {
  return parseSync(srt).filter((n) => n.type === 'cue');
}

test('inserts a single promo caption into a wide gap in the back three-quarters', () => {
  const srt = buildSrt([
    [0, 1000],
    [1200, 2200],
    [2400, 3400],
    [3600, 4600],
    [4800, 5800],
    [6000, 7000],
    [12000, 13000], // 5s gap before this cue
    [13200, 14200]
  ]);

  const out = insertPromoSub(srt);
  const outCues = cues(out);

  const promos = outCues.filter((c) => c.data.text === PROMO_TEXT);
  assert.equal(promos.length, 1);
  assert.equal(outCues.length, 9);

  const promo = promos[0];
  assert.equal(promo.data.start, 7500); // previous end + 500
  assert.equal(promo.data.end, 11500); // next start - 500 (under the 5s cap)
});

test('caps the promo caption at 5 seconds', () => {
  const srt = buildSrt([
    [0, 1000],
    [1200, 2200],
    [2400, 3400],
    [3600, 4600],
    [4800, 5800],
    [6000, 7000],
    [60000, 61000], // huge gap
    [61200, 62200]
  ]);
  const promo = cues(insertPromoSub(srt)).find((c) => c.data.text === PROMO_TEXT);
  assert.equal(promo.data.end - promo.data.start, 5000);
});

test('leaves a gap-free document without a promo caption', () => {
  const srt = buildSrt([
    [0, 1000],
    [1100, 2000],
    [2100, 3000],
    [3100, 4000],
    [4100, 5000],
    [5100, 6000],
    [6100, 7000],
    [7100, 8000]
  ]);
  const out = insertPromoSub(srt);
  assert.ok(!out.includes(PROMO_TEXT));
  assert.equal(cues(out).length, 8);
});

test('does nothing with fewer than two cues', () => {
  const srt = buildSrt([[0, 1000]]);
  const out = insertPromoSub(srt);
  assert.ok(!out.includes(PROMO_TEXT));
  assert.equal(cues(out).length, 1);
});
