import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Wardrobe from './components/Wardrobe';
import Upload from './components/Upload';
import Recommend from './components/Recommend';
import Profile from './components/Profile';

// Configure axios to send auth token with all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [currentPage, setCurrentPage] = useState('wardrobe');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        // Invalid saved data, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('wardrobe');
  };

  const handleSignup = (userData) => {
    setUser(userData);
    setCurrentPage('wardrobe');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!user) {
    if (authMode === 'signup') {
      return <Signup onSignupSuccess={handleSignup} onSwitchToLogin={() => setAuthMode('login')} />;
    }

    return <Login onLogin={handleLogin} onSwitchToSignup={() => setAuthMode('signup')} />;
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-brand">🤖 AI Wardrobe - Welcome, {user.username}!</div>
        <div className="nav-links">
          <button onClick={() => setCurrentPage('wardrobe')}>My Wardrobe</button>
          <button onClick={() => setCurrentPage('upload')}>Upload Item</button>
          <button onClick={() => setCurrentPage('recommend')}>Get Recommendation</button>
          <button onClick={() => setCurrentPage('profile')}>My Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {currentPage === 'wardrobe' && <Wardrobe />}
        {currentPage === 'upload' && <Upload />}
        {currentPage === 'recommend' && <Recommend />}
        {currentPage === 'profile' && <Profile />}
      </div>
    </div>
  );
}

export default App;
