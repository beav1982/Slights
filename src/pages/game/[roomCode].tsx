// src/pages/game/[roomCode].tsx

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import GamePage from '../../components/GamePage';
export default function GameWrapper() {
  const router = useRouter();
  const roomCode = router.query.roomCode as string;

  // Optional: Use useEffect for logging or validation
  useEffect(() => {
    if (!roomCode) {
      console.warn('Room code is undefined — routing delay or invalid URL');
    }
  }, [roomCode]);

  if (!roomCode) {
    return (
      <div className="text-center p-10 text-white">
        <h2 className="text-xl font-semibold text-yellow-400">Loading room...</h2>
        <p className="text-gray-300 mt-2">Please wait while we connect.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <GamePage />
    </div>
  );
}
