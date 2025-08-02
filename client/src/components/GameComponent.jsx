import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import WalletBalance from './WalletBalance';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const socket = io(API_BASE_URL, { transports: ['websocket'] });

const GameComponent = ({ userId }) => {
  const [gameState, setGameState] = useState({});
  const [betAmount, setBetAmount] = useState('');
  const [hasBet, setHasBet] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [multiplierAtCashout, setMultiplierAtCashout] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [crashed, setCrashed] = useState(false);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isBettingPhase, setIsBettingPhase] = useState(false);
  const [bettingTimeLeft, setBettingTimeLeft] = useState(10);
  const [refreshWallet, setRefreshWallet] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.on('current_round', (data) => {
      console.log('Received current_round:', JSON.stringify(data, null, 2));
      setIsRoundActive(data.active);
      setIsBettingPhase(data.bettingPhase || false);
      setGameState({
        multiplier: data.multiplier || 1.0,
        status: data.active ? 'In Progress' : data.bettingPhase ? 'Betting Phase' : 'Waiting'
      });
    });

    socket.on('betting_phase_start', (data) => {
      console.log('Betting phase started:', JSON.stringify(data, null, 2));
      setIsBettingPhase(true);
      setIsRoundActive(false);
      setGameState({ multiplier: 1.0, status: 'Betting Phase' });
      setCrashed(false);
      setHasBet(false);
      setHasCashedOut(false);
      setMultiplierAtCashout(null);
      setGameId(null);
      setBettingTimeLeft(10);
      setError(null);
    });

    socket.on('betting_phase_end', (data) => {
      console.log('Betting phase ended:', JSON.stringify(data, null, 2));
      setIsBettingPhase(false);
      setBettingTimeLeft(0);
      setGameState({ multiplier: 1.0, status: 'Starting Round' });
    });

    socket.on('round_start', (data) => {
      console.log('Round started:', JSON.stringify(data, null, 2));
      setIsRoundActive(true);
      setIsBettingPhase(false);
      setGameState({ multiplier: 1.0, status: 'In Progress' });
      setCrashed(false);
    });

    socket.on('multiplier_update', (data) => {
      setGameState({ multiplier: data.multiplier, status: 'In Progress' });
    });

    socket.on('round_crash', (data) => {
      console.log('Round crashed:', JSON.stringify(data, null, 2));
      setGameState({ multiplier: data.crashPoint, status: 'Crashed' });
      setIsRoundActive(false);
      setIsBettingPhase(false);
      setCrashed(true);
      if (!hasCashedOut && hasBet) {
        alert("Game crashed! You lost the bet.");
        setHasBet(false);
        setHasCashedOut(false);
        setMultiplierAtCashout(null);
        setGameId(null);
      }
      setRefreshWallet(prev => prev + 1);
    });

    socket.on('player_cashout', (data) => {
      if (data.playerId === userId) {
        console.log('Cashout received:', JSON.stringify(data, null, 2));
        setHasCashedOut(true);
        setMultiplierAtCashout(parseFloat(data.multiplier));
        setHasBet(false);
        setCrashed(false);
        setGameId(null);
        setRefreshWallet(prev => prev + 1);
        alert(`Cashed out at ${data.multiplier}x! Payout: ${data.payout} ${data.crypto}`);
      }
    });

    socket.on('bet_error', (message) => {
      console.log('Bet error:', message);
      setError(`Bet failed: ${message}`);
    });

    socket.on('cashout_error', (message) => {
      console.log('Cashout error received:', message);
      setError(`Cashout failed: ${message}`);
    });

    socket.on('bet_accepted', (data) => {
      console.log('Bet accepted:', JSON.stringify(data, null, 2));
      setError(null);
    });

    socket.on('update_leaderboard', () => {
      console.log('Leaderboard update triggered');
    });

    return () => {
      socket.off('current_round');
      socket.off('betting_phase_start');
      socket.off('betting_phase_end');
      socket.off('round_start');
      socket.off('multiplier_update');
      socket.off('round_crash');
      socket.off('player_cashout');
      socket.off('bet_error');
      socket.off('cashout_error');
      socket.off('bet_accepted');
      socket.off('update_leaderboard');
    };
  }, [userId]);

  useEffect(() => {
    let timer;
    if (isBettingPhase) {
      timer = setInterval(() => {
        setBettingTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBettingPhase]);

  const placeBet = async () => {
    console.log('Betting attempt:', { betAmount, isBettingPhase, hasBet });
    if (!isBettingPhase) {
      setError("Betting only allowed during the betting phase.");
      alert("Betting only allowed during the betting phase.");
      return;
    }
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
      setError("Please enter a valid bet amount.");
      alert("Please enter a valid bet amount.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/game/place-bet`, {
        userId,
        crypto: "bitcoin",
        usdBet: parseFloat(betAmount),
        crashMultiplier: 0,
      });

      console.log('Bet placed, gameId:', res.data.game._id);
      setGameId(res.data.game._id);
      setHasBet(true);
      setHasCashedOut(false);
      setMultiplierAtCashout(null);
      setCrashed(false);
      setRefreshWallet(prev => prev + 1);

      socket.emit("place_bet", {
        username: userId,
        playerId: userId,
        usdAmount: parseFloat(betAmount),
        cryptoAmount: res.data.game.cryptoAmount,
        cryptoType: "BTC"
      });
    } catch (err) {
      console.error("Error placing bet:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      const errorMessage = err.response?.data?.error || err.message;
      setError(`Bet placement failed: ${errorMessage}`);
      alert(`Bet placement failed: ${errorMessage}`);
    }
  };

  const cashOut = () => {
    console.log("Attempting cashout:", { userId, gameId, hasCashedOut, crashed, isRoundActive, hasBet });
    if (hasCashedOut || crashed || !gameId || !isRoundActive || !hasBet) {
      setError("Cashout not allowed.");
      alert("Cashout not allowed.");
      return;
    }

    socket.emit("cashout", { username: userId, playerId: userId });
  };

  const resetBet = () => {
    console.log("Resetting bet:", { isRoundActive, isBettingPhase, hasBet });
    if (isRoundActive || isBettingPhase) {
      setError("Cannot reset bet during an active round or betting phase.");
      alert("Cannot reset bet during an active round or betting phase.");
      return;
    }
    setHasBet(false);
    setHasCashedOut(false);
    setMultiplierAtCashout(null);
    setBetAmount('');
    setCrashed(false);
    setGameId(null);
    setRefreshWallet(prev => prev + 1);
    setError(null);
  };

  console.log('Render:', JSON.stringify({ hasBet, isBettingPhase, isRoundActive, crashed, gameId }, null, 2));

  return (
    <div className="card p-4 mt-4 shadow">
      <h3>💥 Crypto Crash Game</h3>
      <WalletBalance userId={userId} refreshTrigger={refreshWallet} />
      {error && <p className="text-danger">{error}</p>}
      <p>
        Current Multiplier:{" "}
        {typeof gameState.multiplier === "number"
          ? `${gameState.multiplier.toFixed(2)}x`
          : "N/A"}
      </p>
      <p>Status: {gameState.status || (isBettingPhase ? `Betting Phase (${bettingTimeLeft}s)` : isRoundActive ? 'In Progress' : 'Waiting for next round...')}</p>
      {!hasBet && isBettingPhase ? (
        <>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Enter bet amount (USD)"
            className="form-control w-50 mb-2"
          />
          <button className="btn btn-success" onClick={placeBet}>
            Place Bet
          </button>
        </>
      ) : (
        <>
          {hasBet && <p className="text-info">Bet Placed: ${betAmount}</p>}
          {!hasCashedOut && hasBet && (
            <button className="btn btn-warning" onClick={cashOut} disabled={crashed || !isRoundActive || !hasBet}>
              Cash Out
            </button>
          )}
          {hasCashedOut && (
            <p className="text-success">
              Cashed Out at: {multiplierAtCashout?.toFixed(2)}x | Winnings: $
              {(parseFloat(betAmount) * multiplierAtCashout).toFixed(2)}
            </p>
          )}
          {(hasBet || hasCashedOut || crashed) && (
            <button className="btn btn-secondary mt-2" onClick={resetBet} disabled={isRoundActive || isBettingPhase}>
              Reset Bet
            </button>
          )}
        </>
      )}
      {crashed && (
        <p className="text-danger">
          Round crashed at {gameState.multiplier?.toFixed(2)}x
        </p>
      )}
    </div>
  );
};

export default GameComponent;