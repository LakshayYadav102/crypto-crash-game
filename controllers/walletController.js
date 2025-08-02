const Player = require("../models/Player");
const Transaction = require("../models/Transaction");
const { fetchPrices } = require("../services/priceService");
const { v4: uuidv4 } = require("uuid");

exports.getWalletBalance = async (req, res) => {
  try {
    const { username } = req.params;
    const player = await Player.findOne({ username });

    if (!player) return res.status(404).json({ error: "Player not found" });

    const prices = await fetchPrices();

    const balance = {};
    for (const crypto in player.wallet) {
      const usdValue = player.wallet[crypto] * (prices[crypto] || 0);
      balance[crypto] = {
        amount: player.wallet[crypto],
        usdEquivalent: usdValue.toFixed(2)
      };
    }

    res.json({ username: player.username, wallet: balance });

  } catch (err) {
    console.error("Wallet Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.placeBet = async (req, res) => {
  try {
    const { username, usdAmount, cryptoType } = req.body;

    const player = await Player.findOne({ username });
    if (!player) return res.status(404).json({ error: "Player not found" });

    const prices = await fetchPrices();
    const price = prices[cryptoType];

    if (!price) return res.status(400).json({ error: "Unsupported crypto" });

    const cryptoAmount = usdAmount / price;

    if (player.wallet[cryptoType] < cryptoAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    player.wallet[cryptoType] -= cryptoAmount;
    await player.save();

    const transaction = new Transaction({
      playerId: player._id,
      usdAmount,
      cryptoAmount,
      currency: cryptoType,
      transactionType: "bet",
      transactionHash: uuidv4(),
      priceAtTime: price
    });

    await transaction.save();

    // ✅ Add bet to active round
    if (global.currentRound && global.currentRound.active) {
      global.currentRound.bets.push({
        playerId: player._id,
        username: player.username,
        usdAmount,
        cryptoAmount,
        cryptoType,
        status: "pending"
      });
    }

    res.json({
      message: "Bet placed",
      cryptoAmount,
      price,
      transactionHash: transaction.transactionHash
    });

  } catch (err) {
    console.error("Place Bet Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.cashOut = async (req, res) => {
  try {
    const { username, cryptoAmount, cryptoType } = req.body;

    const player = await Player.findOne({ username });
    if (!player) return res.status(404).json({ error: "Player not found" });

    const prices = await fetchPrices();
    const price = prices[cryptoType];

    const usdValue = cryptoAmount * price;

    player.wallet[cryptoType] += cryptoAmount;
    await player.save();

    const transaction = new Transaction({
      playerId: player._id,
      usdAmount: usdValue,
      cryptoAmount,
      currency: cryptoType,
      transactionType: "cashout",
      transactionHash: uuidv4(),
      priceAtTime: price
    });

    await transaction.save();

    res.json({
      message: "Cashout successful",
      cryptoReceived: cryptoAmount,
      usdEquivalent: usdValue.toFixed(2),
      transactionHash: transaction.transactionHash
    });

  } catch (err) {
    console.error("Cashout Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
