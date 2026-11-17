const test = require('node:test');
const assert = require('node:assert');
const { parseLine } = require('../src/line');
test('parse entero', () => assert.deepStrictEqual(parseLine('A1;2;10'), { sku: 'A1', qty: 2, unitPrice: 10 }));
