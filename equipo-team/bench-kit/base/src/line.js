function parseLine(line) {
  const [sku, qty, unitPrice] = line.split(';');
  return { sku: sku.trim(), qty: parseInt(qty, 10), unitPrice: parseInt(unitPrice, 10) };
}
module.exports = { parseLine };
