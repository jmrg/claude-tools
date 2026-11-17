const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { saveSummary, loadHistory } = require('../src/history');
const { buildSummary } = require('../src/summary');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hist-'));
const mk = n => buildSummary([`A${n};${n + 1};10`, 'Z9;1;5'], { discountPct: n });

test('guarda y devuelve en orden', () => {
  const d = tmp(), a = mk(1), b = mk(2), c = mk(3);
  saveSummary(a, d); saveSummary(b, d); saveSummary(c, d);
  assert.deepStrictEqual(loadHistory(d), [a, b, c]);
});
test('guardados muy seguidos no se pierden ni se reordenan', () => {
  const d = tmp(), all = [];
  for (let i = 1; i <= 25; i++) { const s = mk(i); all.push(s); saveSummary(s, d); }
  assert.deepStrictEqual(loadHistory(d), all);
});
test('carpeta inexistente: arreglo vacio', () => assert.deepStrictEqual(loadHistory(path.join(tmp(), 'no-existe')), []));
test('saveSummary crea la carpeta si no existe', () => {
  const d = path.join(tmp(), 'a', 'b'), s = mk(4);
  saveSummary(s, d);
  assert.deepStrictEqual(loadHistory(d), [s]);
});
test('ignora archivos ajenos en la carpeta', () => {
  const d = tmp(), a = mk(5), b = mk(6);
  saveSummary(a, d);
  fs.writeFileSync(path.join(d, 'notas.txt'), 'hola');
  fs.writeFileSync(path.join(d, 'vacio.json'), '');
  saveSummary(b, d);
  assert.deepStrictEqual(loadHistory(d), [a, b]);
});
