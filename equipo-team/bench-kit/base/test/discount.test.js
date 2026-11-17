const test = require('node:test');
const assert = require('node:assert');
const { calcDiscount } = require('../src/discount');
test('calcDiscount basico', () => assert.strictEqual(calcDiscount(200, 10), 20));
