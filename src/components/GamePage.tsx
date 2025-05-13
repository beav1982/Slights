// src/components/GamePage.tsx

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useGameStore } from '../lib/store';
import JudgeView from './JudgeView';
import PlayerView from './PlayerView';

const GamePage: React.FC = () => {
  const router = useRouter();
  const { roomCode } = router.query;

  const roomData = useGameStore((state) => state.roomData);
  const session = useGameStore((state) => state.session);
  const loadRoom = useGameStore((state) => state.loadRoomData);

  useEffect(() => {
    if (roomCode && typeof roomCode === 'string') {
      loadRoom(roomCode);
    }
  }, [roomCode, loadRoom]);

  if (!roomData || !session.name) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-semibold text-red-400">Unable to load game.</h2>
        <p className="text-gray-300 mt-2">Please return to the home page and try again.</p>
      </div>
    );
  }

  const isJudge = roomData.judge === session.name;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-center mb-6">Room: {session.room}</h1>
      {isJudge ? <JudgeView /> : <PlayerView />}
    </div>
  );
};

export default GamePage;
