import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WalletBalance = ({ userId, refreshTrigger }) => {
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [balanceBTC, setBalanceBTC] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setError("No user ID provided");
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/game/wallet/${userId}`);
        console.log('Wallet response:', JSON.stringify(response.data, null, 2));
        const { btcBalance, usdBalance } = response.data;
        setBalanceBTC(btcBalance || 0);
        setBalanceUSD(usdBalance || 0);
        if (usdBalance === 0 && btcBalance > 0) {
          setError("Failed to convert BTC to USD, displaying BTC balance only");
        } else {
          setError(null);
        }
      } catch (error) {
        console.error("Wallet fetch error:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        setError(`Failed to fetch wallet balance: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [userId, refreshTrigger]);

  return (
    <div className="alert alert-info">
      {loading ? (
        <p>Loading wallet balance...</p>
      ) : (
        <>
          💰 Wallet Balance for <strong>{userId}</strong>: <b>${balanceUSD.toFixed(2)}</b> ({balanceBTC.toFixed(8)} BTC)
          {error && <p className="text-danger">{error}</p>}
        </>
      )}
    </div>
  );
};

export default WalletBalance;