import React from 'react';
import { useGameStore } from '../lib/store';
import { Trophy, Award } from 'lucide-react';

const ScoreBoard: React.FC = () => {
  const roomData = useGameStore(state => state.roomData);
  const session = useGameStore(state => state.session);
  
  if (!roomData) return null;
  
  const sortedScores = Object.entries(roomData.scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Trophy className="text-yellow-400 mr-2 h-5 w-5" />
          <h3 className="text-lg font-semibold">Scoreboard</h3>
        </div>
        <div className="text-sm text-gray-400">
          Round {roomData.round}
        </div>
      </div>
      
      <div className="space-y-2">
        {sortedScores.map(([player, score], index) => {
          const isCurrentUser = player === session.name;
          const isJudge = player === roomData.judge;
          
          return (
            <div 
              key={player}
              className={`flex items-center justify-between py-1 px-2 rounded ${
                isCurrentUser ? 'bg-indigo-900/30 text-indigo-200' : ''
              }`}
            >
              <div className="flex items-center">
                {index === 0 && score > 0 && (
                  <Award className="text-yellow-400 mr-1 h-4 w-4" />
                )}
                <span className={isCurrentUser ? 'font-semibold' : ''}>
                  {player}
                  {isJudge && <span className="ml-1 text-yellow-400 text-xs">(Judge)</span>}
                </span>
              </div>
              <span className="font-mono">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBoard;