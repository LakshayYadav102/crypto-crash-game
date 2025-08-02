const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  usdAmount: Number,
  cryptoAmount: Number,
  currency: { type: String, enum: ["BTC", "ETH"] },
  transactionType: { type: String, enum: ["bet", "cashout"] },
  transactionHash: String, // mock hash
  priceAtTime: Number, // USD per 1 crypto
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);
