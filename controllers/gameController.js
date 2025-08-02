const Game = require("../models/Game");
const Wallet = require("../models/Wallet");

// POST /api/game/start
const startGame = async (req, res) => {
  const { userId, betAmount } = req.body;

  if (!userId || !betAmount) {
    return res.status(400).json({ message: "userId and betAmount are required." });
  }

  try {
    const newGame = new Game({
      userId,
      betAmount,
      multiplier: 1.0, // starts at 1x
      result: "loss",  // default; will update on cash out
    });

    const savedGame = await newGame.save();

    // 🪙 Deduct bet from wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId }); // default balance is $1000
    }

    wallet.balance -= betAmount;
    await wallet.save();

    res.status(201).json(savedGame);
  } catch (error) {
    console.error("Start Game Error:", error);
    res.status(500).json({ message: "Error starting game", error });
  }
};

// PUT /api/game/cashout/:gameId
const cashOut = async (req, res) => {
  const { gameId } = req.params;
  const { multiplier } = req.body;

  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ message: "Game not found" });

    if (game.cashedOut) {
      return res.status(400).json({ message: "Already cashed out" });
    }

    game.cashedOut = true;
    game.multiplier = multiplier;
    game.result = "win";

    const updatedGame = await game.save();

    // ✅ Add full payout (betAmount * multiplier)
    const payout = multiplier * game.betAmount;

    let wallet = await Wallet.findOne({ userId: game.userId });
    if (!wallet) {
      wallet = new Wallet({ userId: game.userId }); // fallback
    }

    wallet.balance += payout;
    await wallet.save();

    res.json(updatedGame);
  } catch (error) {
    console.error("Cashout Error:", error);
    res.status(500).json({ message: "Error during cashout", error });
  }
};

module.exports = {
  startGame,
  cashOut,
};
