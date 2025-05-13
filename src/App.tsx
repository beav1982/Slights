import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:roomCode" element={<GamePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;