Crypto Crash Game Backend
A backend for a real-time multiplayer "Crypto Crash" game, where players bet in USD, converted to cryptocurrency (BTC), watch a multiplier increase, and cash out before the game crashes. Built with Node.js, Express, MongoDB, Socket.IO, and CoinGecko API for real-time crypto prices.
Features

Game Logic: 10-second betting phase, exponential multiplier growth, provably fair crash points, and cashout mechanics.
Crypto Integration: USD-to-BTC conversion using CoinGecko, with wallet balance management.
WebSockets: Real-time updates for game state, multiplier, cashouts, and leaderboard.
Database: MongoDB stores player wallets, game rounds, and individual bets.
Provably Fair: Crash points generated using a seed and round ID, stored for transparency.

Prerequisites

Node.js (v16 or higher)
MongoDB (local or cloud, e.g., MongoDB Atlas)
CoinGecko API (free, no key required)
npm or yarn

Setup Instructions

Clone the Repository:
git clone <repository-url>
cd crypto-crash-game


Install Dependencies:
npm install


Set Up Environment Variables:Create a .env file in the root directory:
MONGODB_URI=mongodb://localhost:27017/crashgame
PORT=5000


Start MongoDB:Ensure MongoDB is running locally or update MONGODB_URI for a cloud instance.

Run the Backend:
npm start

The server runs on http://localhost:5000.

Run the Frontend (if included):
cd frontend
npm install
npm start

Access at http://localhost:3000.


Database Population
Run the provided populateDB.js script to create sample data:
node scripts/populateDB.js

This creates 3 players and 5 game rounds with bets and cashouts.
API Endpoints

POST /api/game/place-bet: Place a bet in USD, converted to BTC.
Body: { "userId": "string", "crypto": "bitcoin", "usdBet": number, "crashMultiplier": 0 }
Response: { success: true, game: {...} }


GET /api/game/wallet/:userId: Get player’s BTC and USD balance.
Response: { success: true, btcBalance: number, usdBalance: number }


GET /api/game/player/:userId: Get player’s wallet.
Response: { success: true, wallet: { BTC: number, ETH: number } }


GET /api/game/debug/reset-balance/:userId: Reset player’s balance to 0.1 BTC.
Response: { success: true, wallet: {...} }


GET /api/game/: Get all game rounds.
Response: { success: true, games: [...] }


GET /api/game/leaderboard: Get top 5 players by profit.
Response: { success: true, leaderboard: [{ _id: string, totalProfit: number }, ...] }



WebSocket Events

Server Emits:
current_round: Current game state (roundId, active, bettingPhase, multiplier).
betting_phase_start/end: Betting phase transitions.
round_start: Round begins.
multiplier_update: Multiplier updates every 100ms.
round_crash: Round crashes with crash point.
player_cashout: Player cashes out with payout.
update_leaderboard: Triggers leaderboard refresh.
bet_error, cashout_error: Error messages.
bet_accepted: Bet confirmation.


Client Emits:
place_bet: { username, playerId, usdAmount, cryptoAmount, cryptoType }
cashout: { username, playerId }



Testing

API Testing:Use the provided postman_collection.json in Postman to test endpoints.
WebSocket Testing:Open websocket_client.html in a browser to test real-time updates.
MongoDB:Connect to crashgame database and verify collections:use crashgame
show collections  // Should show: games, gameRounds, players



Troubleshooting

Leaderboard Empty: Check db.games.find({ result: "win" }). Insert a test win if needed:db.games.insertOne({
  userId: "3",
  crypto: "bitcoin",
  usdBet: 10,
  cryptoAmount: 0.00016667,
  multiplierAtCashOut: 2.5,
  crashMultiplier: null,
  result: "win",
  timestamp: new Date(),
  roundId: "test-round-" + new Date().toISOString()
})


WebSocket Issues: Ensure http://localhost:5000 is accessible. Check server logs for "Client connected".
API Errors: Verify CoinGecko API connectivity and MongoDB connection.

Notes

Simulated crypto transactions; no real blockchain interactions.
CoinGecko rate limits handled with caching (60s) and fallback price (60000).
Provably fair crash points stored in gameRounds for verification.
Frontend (GameComponent.jsx, Leaderboard.jsx) included for extra points.
