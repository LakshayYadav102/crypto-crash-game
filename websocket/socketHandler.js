const { generateCrashPoint } = require("../utils/crashGenerator");
const GameRound = require("../models/GameRound");
const Player = require("../models/Player");
const { fetchPrices } = require("../services/priceService");
const { v4: uuidv4 } = require("uuid");

let currentRound = null;
let multiplier = 1.0;
let crashPoint = null;
let growthFactor = 0.0025;
let startTime = null;
let timer = null;
let ioGlobal = null;

module.exports = function socketHandler(io) {
  ioGlobal = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("cashout", async ({ username }) => {
      if (!currentRound || !currentRound.active) return;

      const player = await Player.findOne({ username });
      if (!player) return;

      const bet = currentRound.bets.find(b => b.username === username);
      if (!bet || bet.status !== "pending") return;

      bet.status = "won";
      bet.multiplierAtCashout = multiplier;

      const payout = bet.cryptoAmount * multiplier;
      player.wallet[bet.cryptoType] += payout;
      await player.save();

      io.emit("player_cashout", {
        username,
        multiplier: multiplier.toFixed(2),
        crypto: bet.cryptoType,
        payout: payout.toFixed(8)
      });
    });

    socket.emit("current_round", {
      roundId: currentRound?.roundId,
      active: currentRound?.active || false,
      multiplier
    });
  });

  startNewRound();
};

async function startNewRound() {
  multiplier = 1.0;
  startTime = Date.now();
  const seed = uuidv4();
  const roundId = uuidv4();
  crashPoint = generateCrashPoint(seed, roundId);

  currentRound = {
    roundId,
    seed,
    crashPoint,
    bets: [],
    active: true
  };

  global.currentRound = currentRound;

  ioGlobal.emit("round_start", {
    roundId,
    crashPoint: "??",
    message: "New round started"
  });

  startMultiplierLoop();
}

function startMultiplierLoop() {
  clearInterval(timer);
  timer = setInterval(async () => {
    const timeElapsed = (Date.now() - startTime) / 1000;
    multiplier = 1 + (timeElapsed * growthFactor * 100);
    multiplier = Number(multiplier.toFixed(2));

    if (multiplier >= crashPoint) {
      await endRound();
      return;
    }

    ioGlobal.emit("multiplier_update", { multiplier });
  }, 100);
}

async function endRound() {
  clearInterval(timer);
  currentRound.active = false;

  for (let bet of currentRound.bets) {
    if (bet.status === "pending") {
      bet.status = "lost";
      bet.multiplierAtCashout = null;
    }
  }

  const newRound = new GameRound({
    roundId: currentRound.roundId,
    seed: currentRound.seed,
    crashPoint: currentRound.crashPoint,
    bets: currentRound.bets.map(b => ({
      playerId: b.playerId,
      usdAmount: b.usdAmount,
      cryptoAmount: b.cryptoAmount,
      cryptoType: b.cryptoType,
      multiplierAtCashout: b.multiplierAtCashout,
      status: b.status
    }))
  });

  await newRound.save();

  ioGlobal.emit("round_crash", {
    crashPoint: currentRound.crashPoint,
    message: "Round crashed!"
  });

  setTimeout(() => {
    startNewRound();
  }, 10000); // 10 seconds between rounds
}
