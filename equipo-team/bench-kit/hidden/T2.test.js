const test = require('node:test');
const assert = require('node:assert');
const { parseLine: p } = require('../src/line');
test('decimales', () => assert.deepStrictEqual(p('A1;2;10.50'), { sku: 'A1', qty: 2, unitPrice: 10.5 }));
test('trim', () => assert.deepStrictEqual(p(' A1 ; 3 ; 7.25 '), { sku: 'A1', qty: 3, unitPrice: 7.25 }));
test('precio cero valido', () => assert.strictEqual(p('A1;1;0').unitPrice, 0));
test('qty invalida', () => { for (const q of ['abc', '0', '-3', '2.5', '']) assert.throws(() => p(`A1;${q};5`), /qty/); });
test('precio invalido', () => { for (const u of ['x', '-1', '', 'NaN']) assert.throws(() => p(`A1;2;${u}`), /unitPrice/); });
