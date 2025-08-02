const mongoose = require("mongoose");

const gameRoundSchema = new mongoose.Schema({
  roundId: { type: String, required: true },
  crashPoint: { type: Number, required: true },
  seed: { type: String, required: true },
  bets: [{
    playerId: { type: String, required: true }, // Changed to String
    usdAmount: { type: Number, required: true },
    cryptoAmount: { type: Number, required: true },
    cryptoType: { type: String, required: true },
    multiplierAtCashout: { type: Number, default: null },
    status: { type: String, enum: ["won", "lost", "pending"], default: "pending" }
  }],
}, { timestamps: true });

module.exports = mongoose.model("GameRound", gameRoundSchema);