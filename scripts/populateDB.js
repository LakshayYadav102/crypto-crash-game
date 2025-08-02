const mongoose = require('mongoose');
const Player = require('../models/Player');
const Game = require('../models/Game');
const GameRound = require('../models/GameRound');
const { v4: uuidv4 } = require('uuid');

async function populateDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crashgame', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Clear existing data
    await Player.deleteMany({});
    await Game.deleteMany({});
    await GameRound.deleteMany({});
    console.log('Cleared existing data');

    // Create 3 players
    const players = [
      { username: '1', wallet: { BTC: 0.1, ETH: 0 } },
      { username: '2', wallet: { BTC: 0.15, ETH: 0 } },
      { username: '3', wallet: { BTC: 0.2, ETH: 0 } }
    ];
    await Player.insertMany(players);
    console.log('Created 3 players:', JSON.stringify(players, null, 2));

    // Create 5 game rounds
    const rounds = [];
    for (let i = 0; i < 5; i++) {
      const roundId = uuidv4();
      const seed = uuidv4();
      const crashPoint = 1 + Math.random() * 5; // Random crash between 1x and 6x
      const bets = [
        {
          playerId: players[i % 3].username,
          usdAmount: 10,
          cryptoAmount: 0.00016667, // $10 at ~60000 BTC price
          cryptoType: 'BTC',
          multiplierAtCashout: i % 2 === 0 ? crashPoint * 0.8 : null, // Cash out for even rounds
          status: i % 2 === 0 ? 'won' : 'lost'
        }
      ];

      rounds.push({
        roundId,
        seed,
        crashPoint,
        bets
      });

      // Create Game documents for bets
      await Game.create({
        userId: bets[0].playerId,
        crypto: 'bitcoin',
        usdBet: bets[0].usdAmount,
        cryptoAmount: bets[0].cryptoAmount,
        multiplierAtCashOut: bets[0].multiplierAtCashout,
        crashMultiplier: bets[0].status === 'lost' ? crashPoint : null,
        result: bets[0].status === 'won' ? 'win' : 'loss',
        timestamp: new Date(),
        roundId
      });
    }

    await GameRound.insertMany(rounds);
    console.log('Created 5 game rounds:', JSON.stringify(rounds, null, 2));

    // Update player wallets for wins
    for (const round of rounds) {
      for (const bet of round.bets) {
        if (bet.status === 'won') {
          const player = await Player.findOne({ username: bet.playerId });
          player.wallet.BTC += bet.cryptoAmount * bet.multiplierAtCashout;
          await player.save();
        }
      }
    }

    console.log('Database populated successfully');
  } catch (err) {
    console.error('Error populating database:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

populateDB();