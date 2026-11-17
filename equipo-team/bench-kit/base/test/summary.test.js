const test = require('node:test');
const assert = require('node:assert');
const { buildSummary } = require('../src/summary');
test('summary basico', () => {
  const r = buildSummary(['A1;2;10', 'B2;1;5'], { discountPct: 10 });
  assert.strictEqual(r.items.length, 2);
  assert.strictEqual(r.subtotal, 25);
  assert.strictEqual(r.discount, 2.5);
  assert.strictEqual(r.total, 22.5);
});
