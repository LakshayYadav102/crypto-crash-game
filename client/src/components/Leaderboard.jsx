import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const socket = io(API_BASE_URL, { transports: ['websocket'] });

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/game/leaderboard`);
      console.log('Leaderboard response:', JSON.stringify(res.data, null, 2));
      setLeaders(res.data.leaderboard || []);
      setError(null);
    } catch (error) {
      console.error("Leaderboard fetch error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError("Failed to fetch leaderboard");
    } finally {
      setLoading(false);
      console.log('Leaders state:', { leaders, error, loading });
    }
  };

  useEffect(() => {
    fetchLeaders();

    // Poll every 10 seconds
    const interval = setInterval(fetchLeaders, 10000);

    // Listen for leaderboard update events
    socket.on('update_leaderboard', () => {
      console.log('Received update_leaderboard event');
      fetchLeaders();
    });

    return () => {
      clearInterval(interval);
      socket.off('update_leaderboard');
    };
  }, []);

  return (
    <div className="mt-5">
      <h4>🏆 Top 5 Winners</h4>
      {loading ? (
        <p>Loading leaderboard...</p>
      ) : (
        <>
          {error && <p className="text-danger">{error}</p>}
          <table className="table table-bordered table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Total Profit ($)</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length > 0 ? (
                leaders.map((user, index) => (
                  <tr key={user._id}>
                    <td>{index + 1}</td>
                    <td>{user._id}</td>
                    <td>{user.totalProfit.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No winners yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default Leaderboard;