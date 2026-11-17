const test = require('node:test');
const assert = require('node:assert');
const { calcPriceWithTax: f, calcDiscount } = require('../src/discount');
test('basico', () => assert.deepStrictEqual(f(1000, 10, 15), { discount: 100, tax: 135, total: 1035 }));
test('decimales', () => assert.deepStrictEqual(f(1000, 5.5, 12), { discount: 55, tax: 113.4, total: 1058.4 }));
test('redondeo', () => assert.deepStrictEqual(f(333.33, 7, 15), { discount: 23.33, tax: 46.5, total: 356.5 }));
test('cero', () => assert.deepStrictEqual(f(0, 10, 15), { discount: 0, tax: 0, total: 0 }));
test('errores', () => {
  for (const a of [[-1, 10, 15], [100, -1, 15], [100, 10, -1], [NaN, 10, 15], [100, Infinity, 15], ['100', 10, 15], [100, 10, undefined]])
    assert.throws(() => f(...a), RangeError);
});
test('calcDiscount intacta', () => assert.strictEqual(calcDiscount(200, 10), 20));
