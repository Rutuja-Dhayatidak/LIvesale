/**
 * Generates a unique Health Store order number.
 * Format: FG-HS-YYYYMMDD-XXXX
 */
const generateOrderNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit
  return `FG-HS-${date}-${random}`;
};

module.exports = generateOrderNumber;
