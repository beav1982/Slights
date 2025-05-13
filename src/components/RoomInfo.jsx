import React from 'react';
import { useGameStore } from '../lib/store';
import { Copy, Users } from 'lucide-react';

const RoomInfo: React.FC = () => {
  const session = useGameStore(state => state.session);
  const roomData = useGameStore(state => state.roomData);
  
  if (!session.room || !roomData) return null;
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(session.room || '');
  };
  
  return (
    <div className="bg-gray-800 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between">
      <div>
        <div className="flex items-center">
          <h3 className="font-bold mr-2">Room Code:</h3>
          <code className="bg-gray-900 px-2 py-1 rounded text-indigo-300 font-mono mr-2">
            {session.room}
          </code>
          <button 
            onClick={copyRoomCode}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy Room Code"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        
        <div className="mt-1 text-sm text-gray-400">
          {roomData.players.length} {roomData.players.length === 1 ? 'player' : 'players'} connected
        </div>
      </div>
      
      <div className="mt-2 sm:mt-0 flex items-center text-gray-300 text-sm">
        <Users className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline mr-1">Players:</span>
        {roomData.players.map((player, i) => (
          <React.Fragment key={player}>
            <span className={player === roomData.judge ? 'text-yellow-400' : ''}>
              {player}
            </span>
            {i < roomData.players.length - 1 && <span className="mx-1">•</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default RoomInfo;