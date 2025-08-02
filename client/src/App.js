import React, { useState } from 'react';
import GameComponent from './components/GameComponent';
import Leaderboard from './components/Leaderboard';
import WalletBalance from './components/WalletBalance';

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const [inputId, setInputId] = useState('');

  const handleLogin = () => {
    if (inputId.trim()) {
      localStorage.setItem('userId', inputId.trim());
      setUserId(inputId.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUserId('');
    setInputId('');
  };

  return (
    <div className="container mt-5">
      {!userId ? (
        <div className="text-center">
          <h2>Login</h2>
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="Enter User ID"
            className="form-control w-50 mx-auto"
          />
          <button onClick={handleLogin} className="btn btn-primary mt-3">Login</button>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between mb-3">
            <h4>Welcome, {userId}</h4>
            <button onClick={handleLogout} className="btn btn-sm btn-danger">Logout</button>
          </div>
          <WalletBalance userId={userId} />
          <GameComponent userId={userId} />
          <Leaderboard />
        </>
      )}
    </div>
  );
}

export default App;
