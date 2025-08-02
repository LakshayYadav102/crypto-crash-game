const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  crypto: { type: String, required: true }, // e.g., "bitcoin"
  usdBet: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  multiplierAtCashOut: { type: Number, default: null }, // null if not cashed out
  crashMultiplier: {
  type: Number,
  default: null,
  required: false,
},
  result: { type: String, enum: ["win", "loss", "pending"], default: "pending" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Game", gameSchema);
