import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../lib/store';
import PlayerView from '../components/PlayerView';
import JudgeView from '../components/JudgeView';
import ScoreBoard from '../components/ScoreBoard';
import RoomInfo from '../components/RoomInfo';
import AudioEffects from '../components/AudioEffects';
import { ArrowLeft } from 'lucide-react';

const GamePage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const session = useGameStore(state => state.session);
  const setSession = useGameStore(state => state.setSession);
  const roomData = useGameStore(state => state.roomData);
  const loadRoomData = useGameStore(state => state.loadRoomData);
  
  // If we have a roomCode from URL but not in state, set it
  useEffect(() => {
    if (roomCode && !session.room) {
      setSession({ room: roomCode });
    }
  }, [roomCode, session.room, setSession]);
  
  // Load room data when we have a room
  useEffect(() => {
    if (session.room) {
      const intervalId = setInterval(() => {
        loadRoomData(session.room!).catch(console.error);
      }, 3000);
      
      // Initial load
      loadRoomData(session.room).catch(console.error);
      
      return () => clearInterval(intervalId);
    }
  }, [session.room, loadRoomData]);
  
  // Redirect to home if no name is set
  useEffect(() => {
    if (session.room && !session.name) {
      navigate('/');
    }
  }, [session.room, session.name, navigate]);
  
  if (!session.room || !session.name || !roomData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-center">
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }
  
  const isJudge = session.name === roomData.judge;
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl min-h-screen flex flex-col">
      <AudioEffects />
      
      <header className="mb-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => navigate('/')}
            className="mr-3 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Slights</h1>
          <div className="ml-auto text-sm">
            Playing as: <span className="font-semibold">{session.name}</span>
            {isJudge && <span className="ml-2 text-yellow-400">(Judge)</span>}
          </div>
        </div>
        
        <RoomInfo />
      </header>
      
      <div className="flex flex-col md:flex-row gap-6 flex-grow">
        <div className="md:w-3/4">
          <div className="card">
            {isJudge ? <JudgeView /> : <PlayerView />}
          </div>
        </div>
        
        <div className="md:w-1/4">
          <ScoreBoard />
        </div>
      </div>
    </div>
  );
};

export default GamePage;