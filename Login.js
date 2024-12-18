import React, { useState } from 'react';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    if (username.trim()) {
      setUser(username.trim());
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleLogin} disabled={!username.trim()}>
        Login
      </button>
    </div>
  );
};

export default Login;
