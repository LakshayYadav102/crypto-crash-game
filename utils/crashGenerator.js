const crypto = require("crypto");

// Generates a provably fair crash point between 1.00x and 100.00x
function generateCrashPoint(seed, roundNumber) {
  const hash = crypto.createHash("sha256").update(seed + roundNumber).digest("hex");
  const num = parseInt(hash.slice(0, 8), 16); // First 8 hex digits
  const r = num / 0xffffffff; // Normalize to [0, 1]

  if (r < 0.01) return 1.00; // 1% chance to crash immediately

  // Curve up to 100x, e.g. exponential-like drop-off
  const crashPoint = Math.min(100, Math.floor((1 / (1 - r)) * 100) / 100);
  return Number(crashPoint.toFixed(2));
}

module.exports = { generateCrashPoint };
