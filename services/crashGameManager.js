const { generateCrashPoint } = require("../utils/crashGenerator");
const GameRound = require("../models/GameRound");
const Player = require("../models/Player");
const Game = require("../models/Game");
const { v4: uuidv4 } = require("uuid");

let ioGlobal = null;
let currentRound = null;
let multiplier = 1.0;
let crashPoint = null;
let growthFactor = 0.0025;
let startTime = null;
let timer = null;

function initializeGame(io) {
  ioGlobal = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.emit("current_round", {
      roundId: currentRound?.roundId,
      active: currentRound?.active || false,
      bettingPhase: currentRound?.bettingPhase || false,
      multiplier
    });

    socket.on("place_bet", async ({ username, usdAmount, cryptoAmount, cryptoType, playerId }) => {
      console.log("Place bet attempt:", { username, playerId, usdAmount, cryptoType, cryptoAmount });
      if (!currentRound || !currentRound.bettingPhase) {
        console.log("Bet rejected: Not in betting phase", { username, playerId });
        return socket.emit("bet_error", "Betting only allowed during betting phase.");
      }

      const alreadyBet = currentRound.bets.find(b => b.playerId === playerId);
      if (alreadyBet) {
        console.log("Bet rejected: Already bet", { username, playerId });
        return socket.emit("bet_error", "Already placed a bet in this round.");
      }

      currentRound.bets.push({
        username,
        playerId,
        usdAmount,
        cryptoAmount,
        cryptoType,
        status: "pending",
        multiplierAtCashout: null
      });

      console.log("Bet accepted:", { roundId: currentRound.roundId, playerId, bets: currentRound.bets });
      socket.emit("bet_accepted", {
        roundId: currentRound.roundId,
        multiplier: 1.0,
        message: "Bet placed"
      });
    });

    socket.on("cashout", async ({ username, playerId }) => {
      console.log("Cashout attempt:", { username, playerId, roundId: currentRound?.roundId, bets: currentRound?.bets });
      if (!currentRound || !currentRound.active) {
        console.log("Cashout failed: No active round", { username, playerId });
        return socket.emit("cashout_error", "No active round.");
      }

      let player = await Player.findOne({ username });
      if (!player) {
        console.log("Player not found, creating new player:", { username });
        player = new Player({ username, wallet: { BTC: 0.1, ETH: 0 } });
        await player.save();
        console.log("New player created:", JSON.stringify(player, null, 2));
      }

      const bet = currentRound.bets.find(b => b.playerId === playerId);
      if (!bet || bet.status !== "pending") {
        console.log("Cashout failed: No valid bet", { username, playerId, betStatus: bet?.status });
        return socket.emit("cashout_error", "Already cashed out or no bet.");
      }

      bet.status = "won";
      bet.multiplierAtCashout = multiplier;

      const payout = parseFloat((bet.cryptoAmount * multiplier).toFixed(8));
      player.wallet[bet.cryptoType] = (player.wallet[bet.cryptoType] || 0) + payout;
      await player.save().catch(err => {
        console.error("Error saving player wallet:", { message: err.message, stack: err.stack });
        socket.emit("cashout_error", "Error updating wallet.");
      });

      // Update or create Game document
      try {
        let game = await Game.findOne({ userId: playerId, roundId: currentRound.roundId, result: "pending" });
        if (!game) {
          console.warn("Game document not found, creating new:", { userId: playerId, roundId: currentRound.roundId });
          game = new Game({
            userId: playerId,
            crypto: bet.cryptoType.toLowerCase(),
            usdBet: bet.usdAmount,
            cryptoAmount: bet.cryptoAmount,
            multiplierAtCashOut: multiplier,
            crashMultiplier: null,
            result: "win",
            timestamp: new Date(),
            roundId: currentRound.roundId
          });
        } else {
          game.result = "win";
          game.multiplierAtCashOut = multiplier;
        }
        await game.save();
        console.log("Game document updated/created for cashout:", JSON.stringify(game, null, 2));
      } catch (err) {
        console.error("Error updating/creating Game document:", { message: err.message, stack: err.stack });
        socket.emit("cashout_error", "Error updating game record.");
      }

      console.log("Cashout successful:", { username, playerId, payout, multiplier: multiplier.toFixed(2) });
      ioGlobal.emit("player_cashout", {
        username,
        playerId,
        multiplier: multiplier.toFixed(2),
        crypto: bet.cryptoType,
        payout
      });
      ioGlobal.emit("update_leaderboard");
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  runGameLoop();
}

function runGameLoop() {
  const roundCycle = async () => {
    await bettingPhase();
    await startNewRound();
    await runMultiplierLoop();
    await endRound();
  };

  roundCycle();
}

async function bettingPhase() {
  currentRound = {
    roundId: uuidv4(),
    seed: uuidv4(),
    crashPoint: null,
    bets: [],
    active: false,
    bettingPhase: true
  };
  global.currentRound = currentRound;

  console.log("Emitting betting_phase_start", { roundId: currentRound.roundId });
  ioGlobal.emit("betting_phase_start", {
    roundId: currentRound.roundId,
    message: "Betting phase started"
  });

  await new Promise(resolve => setTimeout(resolve, 10000));

  currentRound.bettingPhase = false;
  console.log("Emitting betting_phase_end", { roundId: currentRound.roundId });
  ioGlobal.emit("betting_phase_end", {
    roundId: currentRound.roundId,
    message: "Betting phase ended"
  });
}

async function startNewRound() {
  multiplier = 1.0;
  startTime = Date.now();
  crashPoint = generateCrashPoint(currentRound.seed, currentRound.roundId);

  currentRound.active = true;
  currentRound.crashPoint = crashPoint;
  global.currentRound = currentRound;

  console.log("Emitting round_start", { roundId: currentRound.roundId });
  ioGlobal.emit("round_start", {
    roundId: currentRound.roundId,
    crashPoint: "??",
    message: "New round started"
  });
}

function runMultiplierLoop() {
  return new Promise((resolve) => {
    timer = setInterval(() => {
      const timeElapsed = (Date.now() - startTime) / 1000;
      multiplier = 1 + (timeElapsed * growthFactor * 100);
      multiplier = parseFloat(multiplier.toFixed(2));

      if (multiplier >= crashPoint) {
        clearInterval(timer);
        resolve();
      } else {
        ioGlobal.emit("multiplier_update", { multiplier });
      }
    }, 100);
  });
}

async function endRound() {
  currentRound.active = false;

  for (let bet of currentRound.bets) {
    if (bet.status === "pending") {
      bet.status = "lost";
      bet.multiplierAtCashout = null;
      // Update Game document for loss
      try {
        const game = await Game.findOne({ userId: bet.playerId, roundId: currentRound.roundId, result: "pending" });
        if (game) {
          game.result = "loss";
          game.crashMultiplier = currentRound.crashPoint;
          await game.save();
          console.log("Game document updated for loss:", JSON.stringify(game, null, 2));
        } else {
          console.warn("Game document not found for loss:", { userId: bet.playerId, roundId: currentRound.roundId });
        }
      } catch (err) {
        console.error("Error updating Game document for loss:", { message: err.message, stack: err.stack });
      }
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

  try {
    await newRound.save();
    console.log("GameRound saved:", JSON.stringify(newRound, null, 2));
  } catch (err) {
    console.error("Error saving GameRound:", {
      message: err.message,
      stack: err.stack
    });
  }

  console.log("Emitting round_crash", { roundId: currentRound.roundId, crashPoint: currentRound.crashPoint });
  ioGlobal.emit("round_crash", {
    roundId: currentRound.roundId,
    seed: currentRound.seed,
    crashPoint: currentRound.crashPoint,
    message: "Round crashed!"
  });
  ioGlobal.emit("update_leaderboard");

  setTimeout(runGameLoop, 1000);
}

module.exports = initializeGame;