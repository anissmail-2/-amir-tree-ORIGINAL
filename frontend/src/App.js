import React, { useState } from 'react';
import './App.css';
import Login from './components/Login';
import Wardrobe from './components/Wardrobe';
import Upload from './components/Upload';
import Recommend from './components/Recommend';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);

  const handleLogin = (username) => {
    setUser(username);
    setCurrentPage('wardrobe');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('login');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-brand">🤖 AI Wardrobe</div>
        <div className="nav-links">
          <button onClick={() => setCurrentPage('wardrobe')}>My Wardrobe</button>
          <button onClick={() => setCurrentPage('upload')}>Upload Item</button>
          <button onClick={() => setCurrentPage('recommend')}>Get Recommendation</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {currentPage === 'wardrobe' && <Wardrobe />}
        {currentPage === 'upload' && <Upload />}
        {currentPage === 'recommend' && <Recommend />}
      </div>
    </div>
  );
}

export default App;
