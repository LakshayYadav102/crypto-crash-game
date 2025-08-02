# Crypto Crash Game Backend

A backend for a real-time multiplayer **Crypto Crash** game, where players bet in USD (converted to BTC), watch a multiplier rise, and cash out before the game crashes.

Built using:
- **Node.js**, **Express.js**, **MongoDB**
- **Socket.IO** for real-time gameplay
- **CoinGecko API** for real-time cryptocurrency prices

---

## 🌟 Features

- 🎮 **Real-Time Game Logic**: 10-second betting phase, exponential multiplier, fair crash mechanics.
- 💸 **Crypto Integration**: Live USD-to-BTC conversion with wallet balance tracking.
- 🔌 **WebSockets**: Real-time updates on game state, multiplier, cashouts, and leaderboard.
- 🗃️ **Database**: MongoDB stores player wallets, game rounds, bets, and profits.
- ✅ **Provably Fair**: Transparent crash point generation with stored seeds and round IDs.

---

## 🚀 Live Links

- 🔗 **Frontend (Netlify)**: [https://crypto-crash-game12.netlify.app/](https://crypto-crash-game12.netlify.app/)
- 🔗 **Backend (Render)**: [https://crypto-crash-backend-11t1.onrender.com](https://crypto-crash-backend-11t1.onrender.com)

---

## 🛠️ Prerequisites

- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn
- No CoinGecko API key needed

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd crypto-crash-game
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root:

```env
MONGODB_URI=mongodb://localhost:27017/crashgame
PORT=5000
```

### 4. Start MongoDB

Ensure your MongoDB is running locally or update the URI for Atlas.

### 5. Run the Backend

```bash
npm start
```

- Server: [http://localhost:5000](http://localhost:5000)

### 6. Run the Frontend

```bash
cd client
npm install
npm start
```

- Frontend: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Sample Data (Optional)

Run the provided script to populate sample players and rounds:

```bash
node scripts/populateDB.js
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/game/place-bet` | Place a bet |
| GET | `/api/game/wallet/:userId` | Get wallet balance |
| GET | `/api/game/player/:userId` | Get player wallet |
| GET | `/api/game/debug/reset-balance/:userId` | Reset balance |
| GET | `/api/game/` | Get all rounds |
| GET | `/api/game/leaderboard` | Top 5 players by profit |

---

## 🔌 WebSocket Events

### Server Emits:

- `current_round`, `betting_phase_start/end`, `round_start`
- `multiplier_update`, `round_crash`, `player_cashout`
- `update_leaderboard`, `bet_accepted`, `bet_error`, `cashout_error`

### Client Emits:

- `place_bet` → { username, playerId, usdAmount, cryptoAmount, cryptoType }
- `cashout` → { username, playerId }

---

## 🧪 Testing

- **Postman**: Use `postman_collection.json` to test REST API.
- **WebSockets**: Use `websocket_client.html` to simulate game.
- **MongoDB**:
  ```bash
  use crashgame
  show collections
  ```

---

## 🛠 Troubleshooting

- **Leaderboard Empty?**
  Insert a test win:
  ```js
  db.games.insertOne({
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
  ```

- **WebSocket Not Working?** Check server log for `Client connected`
- **Mongo Errors?** Ensure `.env` and MongoDB URI is valid

---

## 📌 Notes

- No real blockchain transactions.
- CoinGecko caching and fallback price set.
- Provably fair logic stored and accessible.
- Frontend game files (`GameComponent.jsx`, `Leaderboard.jsx`) included.

---

## 🧠 Author

> Developed for learning and demonstration purposes by **Lakshay Yadav**.
