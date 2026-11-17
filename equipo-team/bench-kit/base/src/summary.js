const { parseLine } = require('./line');
const { calcDiscount } = require('./discount');

function buildSummary(lines, opts = {}) {
  const items = lines.map(parseLine);
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discount = calcDiscount(subtotal, opts.discountPct || 0);
  return { items, subtotal, discount, total: subtotal - discount };
}
module.exports = { buildSummary };
