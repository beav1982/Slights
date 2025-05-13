import React, { useState } from 'react';
import { useGameStore } from '../lib/store';
import { Crown } from 'lucide-react';
import WinningReveal from './WinningReveal';

const JudgeView: React.FC = () => {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  
  const roomData = useGameStore(state => state.roomData);
  const session = useGameStore(state => state.session);
  const pickWinner = useGameStore(state => state.pickWinner);
  
  if (!roomData || !session.name) return null;
  
  const submissions = Object.entries(roomData.submissions)
    .filter(([player]) => player !== session.name)
    .map(([player, curse]) => ({ player, curse }));
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner) return;
    
    setSubmitting(true);
    try {
      setShowWinner(true);
      get().playSound('win');
    } catch (err) {
      console.error('Error picking winner:', err);
      setSubmitting(false);
    }
  };

  const handleWinnerClose = async () => {
    try {
      await pickWinner(selectedWinner);
      setSelectedWinner('');
      setShowWinner(false);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="p-4 md:p-6">
      {showWinner && (
        <WinningReveal
          winner={selectedWinner}
          curse={roomData.submissions[selectedWinner]}
          onClose={handleWinnerClose}
        />
      )}

      <div className="flex items-center mb-4">
        <Crown className="text-yellow-400 mr-2" />
        <h2 className="text-2xl font-bold text-yellow-100">Judge's Panel</h2>
      </div>
      
      <div className="slight-card mb-8">
        <h3 className="text-xl font-semibold mb-2 text-indigo-200">The Slight:</h3>
        <p className="text-xl italic text-white">{roomData.slight}</p>
      </div>
      
      <h3 className="text-lg font-semibold mb-4 text-gray-200">
        {submissions.length === 0 
          ? 'Waiting for submissions...' 
          : 'Select the best curse:'}
      </h3>
      
      {submissions.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 mb-6">
            {submissions.map(({ player, curse }, index) => (
              <div 
                key={index} 
                className={`submission-card animate-pop cursor-pointer ${selectedWinner === player ? 'border-yellow-500 bg-yellow-900/40' : ''}`}
                onClick={() => setSelectedWinner(player)}
              >
                <label className="flex items-start cursor-pointer">
                  <input 
                    type="radio"
                    name="winner"
                    value={player}
                    checked={selectedWinner === player}
                    onChange={() => setSelectedWinner(player)}
                    className="mt-1 mr-3"
                  />
                  <span>{curse}</span>
                </label>
              </div>
            ))}
          </div>
          
          <button
            type="submit"
            className="btn-success w-full md:w-auto"
            disabled={submitting || !selectedWinner}
          >
            {submitting ? 'Selecting...' : 'Award Point'}
          </button>
        </form>
      ) : (
        <div className="text-center p-8 italic text-gray-400">
          Waiting for players to submit their curses...
        </div>
      )}
    </div>
  );
};

export default JudgeView;