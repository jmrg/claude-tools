const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { buildSummary: b } = require('../src/summary');
test('agrupa y ordena', () => {
  const r = b(['B2;1;5', 'A1;2;10', 'B2;3;5', 'A1;1;10'], { discountPct: 10 });
  assert.deepStrictEqual(r, { items: [{ sku: 'A1', qty: 3, unitPrice: 10, subtotal: 30 }, { sku: 'B2', qty: 4, unitPrice: 5, subtotal: 20 }], subtotal: 50, discount: 5, total: 45 });
});
test('sin descuento', () => { const r = b(['A1;1;10']); assert.strictEqual(r.discount, 0); assert.strictEqual(r.total, 10); });
test('conflicto de precio', () => assert.throws(() => b(['A1;1;10', 'A1;1;11']), /sku/));
const run = (args, env) => spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'cli.js'), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
test('cli ok', () => {
  const f = path.join(os.tmpdir(), 'bench-' + process.pid + '.txt');
  fs.writeFileSync(f, 'B2;1;5\n\nA1;2;10\nB2;3;5\n');
  const r = run([f], { DISCOUNT_PCT: '10' });
  assert.strictEqual(r.status, 0);
  const o = JSON.parse(r.stdout);
  assert.strictEqual(o.subtotal, 40); assert.strictEqual(o.discount, 4); assert.strictEqual(o.total, 36); assert.strictEqual(o.items[0].sku, 'A1');
});
test('cli sin argumento', () => { const r = run([], {}); assert.strictEqual(r.status, 2); assert.match(r.stderr, /uso:/); });
test('readme documenta cli', () => assert.match(fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8'), /cli\.js/));
