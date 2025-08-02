const express = require("express");
const router = express.Router();
const Game = require("../models/Game");
const Player = require("../models/Player");
const mongoose = require("mongoose");
const axios = require("axios");

// Cache for Bitcoin price
let cachedBtcPrice = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 1000; // 60 seconds

const getCryptoPrice = async (crypto, retryCount = 3, delay = 1000) => {
  try {
    if (cachedBtcPrice && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      console.log(`Using cached ${crypto} price: ${cachedBtcPrice}`);
      return cachedBtcPrice;
    }

    for (let i = 0; i < retryCount; i++) {
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
        console.log(`CoinGecko response for ${crypto}:`, JSON.stringify(response.data, null, 2));
        const price = response.data[crypto]?.usd || 0;
        if (price && !isNaN(price) && price > 0) {
          cachedBtcPrice = price;
          cacheTimestamp = Date.now();
          return price;
        }
        console.warn(`CoinGecko retry ${i + 1} returned invalid price: ${price}`);
        if (i < retryCount - 1) await new Promise(resolve => setTimeout(resolve, delay));
      } catch (err) {
        console.warn(`CoinGecko retry ${i + 1} failed:`, err.message);
        if (i === retryCount - 1) throw new Error("Unable to fetch crypto price after retries");
      }
    }
    throw new Error("Invalid response from CoinGecko");
  } catch (err) {
    console.error(`Error fetching ${crypto} price:`, err.message);
    const fallbackPrice = 60000;
    console.log(`Using fallback ${crypto} price: ${fallbackPrice}`);
    cachedBtcPrice = fallbackPrice;
    cacheTimestamp = Date.now();
    return fallbackPrice;
  }
};

router.post("/place-bet", async (req, res) => {
  const { userId, crypto, usdBet, crashMultiplier } = req.body;

  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);

    if (!userId || typeof userId !== "string") {
      console.error("Invalid userId:", { userId });
      return res.status(400).json({ error: "Invalid or missing userId" });
    }
    if (!crypto || typeof crypto !== "string") {
      console.error("Invalid crypto:", { crypto });
      return res.status(400).json({ error: "Invalid or missing crypto type" });
    }
    if (!usdBet || isNaN(usdBet) || usdBet <= 0) {
      console.error("Invalid bet amount:", { usdBet });
      return res.status(400).json({ error: "Invalid bet amount" });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected");
      return res.status(500).json({ error: "Database unavailable" });
    }

    if (!global.currentRound || !global.currentRound.bettingPhase) {
      console.error("Betting phase not active:", { currentRound: global.currentRound });
      return res.status(400).json({ error: "Betting only allowed during betting phase" });
    }
    const existingBet = global.currentRound.bets.find(b => b.playerId === userId);
    if (existingBet) {
      console.error("Already bet in round:", { userId, roundId: global.currentRound.roundId });
      return res.status(400).json({ error: "You have already placed a bet in this round" });
    }

    const price = await getCryptoPrice(crypto.toLowerCase());
    if (!price || isNaN(price) || price <= 0) {
      console.error(`Invalid price for ${crypto}: ${price}`);
      return res.status(500).json({ error: "Unable to fetch crypto price" });
    }

    const cryptoAmount = usdBet / price;
    console.log("Calculated crypto amount:", { usdBet, price, cryptoAmount });

    let player = await Player.findOne({ username: userId });
    if (!player) {
      console.log("Creating new player with initial balance:", { userId });
      player = new Player({ username: userId, wallet: { BTC: 0.1, ETH: 0 } });
      await player.save();
      console.log("New player created:", JSON.stringify(player, null, 2));
    }
    if (player.wallet.BTC < cryptoAmount) {
      console.log("Insufficient BTC balance:", { userId, balance: player.wallet.BTC, required: cryptoAmount });
      return res.status(400).json({ error: "Insufficient BTC balance" });
    }
    player.wallet.BTC -= cryptoAmount;
    await player.save();
    console.log("Player wallet updated:", { userId, newBalance: player.wallet.BTC });

    const game = await Game.create({
      userId,
      crypto: crypto.toLowerCase(),
      usdBet,
      cryptoAmount,
      multiplierAtCashOut: null,
      crashMultiplier: null,
      result: "pending",
      timestamp: new Date(),
      roundId: global.currentRound.roundId
    });
    console.log("Game record created:", JSON.stringify(game, null, 2));

    res.json({ success: true, game });
  } catch (err) {
    console.error("Error placing bet:", {
      message: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    res.status(500).json({ error: "Error placing bet", details: err.message });
  }
});

router.get("/wallet/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);
    let player = await Player.findOne({ username: userId });
    if (!player) {
      console.log("Creating new player with initial balance:", { userId });
      player = new Player({ username: userId, wallet: { BTC: 0.1, ETH: 0 } });
      await player.save();
      console.log("New player created:", JSON.stringify(player, null, 2));
    }

    const btcPrice = await getCryptoPrice("bitcoin");
    const usdBalance = player.wallet.BTC * btcPrice;
    console.log("Wallet balance:", { userId, btcBalance: player.wallet.BTC, usdBalance, btcPrice });

    res.json({ success: true, btcBalance: player.wallet.BTC, usdBalance });
  } catch (err) {
    console.error("Wallet fetch error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: "Error getting wallet balance" });
  }
});

router.get("/player/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);
    let player = await Player.findOne({ username: userId });
    if (!player) {
      console.log("Creating new player with initial balance:", { userId });
      player = new Player({ username: userId, wallet: { BTC: 0.1, ETH: 0 } });
      await player.save();
      console.log("New player created:", JSON.stringify(player, null, 2));
    }
    res.json({ success: true, wallet: player.wallet });
  } catch (err) {
    console.error("Player fetch error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: "Error getting player wallet" });
  }
});

router.get("/debug/reset-balance/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);
    const player = await Player.findOneAndUpdate(
      { username: userId },
      { $set: { "wallet.BTC": 0.1, "wallet.ETH": 0 } },
      { upsert: true, new: true }
    );
    console.log("Player balance reset:", JSON.stringify(player, null, 2));
    res.json({ success: true, wallet: player.wallet });
  } catch (err) {
    console.error("Reset balance error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: "Error resetting balance" });
  }
});

router.get("/", async (req, res) => {
  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);
    const games = await Game.find().sort({ timestamp: -1 });
    console.log("Fetched games:", JSON.stringify(games, null, 2));
    res.json({ success: true, games });
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    console.log("MongoDB connection status:", mongoose.connection.readyState);
    const wins = await Game.find({ result: "win" });
    console.log("Winning games:", JSON.stringify(wins, null, 2));
    const leaderboard = await Game.aggregate([
      { $match: { result: "win" } },
      {
        $group: {
          _id: "$userId",
          totalProfit: {
            $sum: {
              $multiply: [
                { $subtract: ["$multiplierAtCashOut", 1] },
                "$usdBet"
              ]
            }
          }
        }
      },
      { $sort: { totalProfit: -1 } },
      { $limit: 5 }
    ]);
    console.log("Leaderboard data:", JSON.stringify(leaderboard, null, 2));
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;