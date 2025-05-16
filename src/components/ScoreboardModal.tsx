import React from 'react';

interface ScoreboardModalProps {
  scores: Record<string, number>;
  judge: string;
  onClose: () => void;
}

const ScoreboardModal: React.FC<ScoreboardModalProps> = ({ scores, judge, onClose }) => {
  const sortedScores = Object.entries(scores).sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4 border border-indigo-500/30 shadow-2xl text-center">
        <h2 className="text-2xl font-bold mb-4 text-indigo-200">Scoreboard</h2>
        <ul className="space-y-2 mb-6">
          {sortedScores.map(([player, score]) => (
            <li
              key={player}
              className="flex items-center justify-between px-4 py-1 rounded bg-gray-800/60"
            >
              <span className={`font-semibold ${player === judge ? 'text-yellow-400' : ''}`}>
                {player} {player === judge && <span className="text-xs">(Judge)</span>}
              </span>
              <span className="font-mono text-indigo-200">{score}</span>
            </li>
          ))}
        </ul>
        <button className="btn-primary w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ScoreboardModal;
