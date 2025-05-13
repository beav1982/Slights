import React, { useState } from 'react';
import { useGameStore } from '../lib/store';

const PlayerView: React.FC = () => {
  const [selectedCurse, setSelectedCurse] = useState<string>('');
  const [wantRedraw, setWantRedraw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const session = useGameStore(state => state.session);
  const roomData = useGameStore(state => state.roomData);
  const submitCurse = useGameStore(state => state.submitCurse);
  const redrawHand = useGameStore(state => state.redrawHand);
  
  if (!roomData || !session.name) return null;
  
  const playerHand = roomData.hands[session.name] || [];
  const hasSubmitted = !!roomData.submissions[session.name];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (wantRedraw) {
        await redrawHand();
        setSelectedCurse('');
        setWantRedraw(false);
      } else if (selectedCurse) {
        await submitCurse(selectedCurse);
      }
    } catch (err) {
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="text-center p-8 animate-pulse">
        <h3 className="text-2xl mb-4">Submission received!</h3>
        <p className="text-gray-300 italic">Waiting for other players and the judge's decision...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="slight-card mb-8">
        <h3 className="text-xl font-semibold mb-2 text-indigo-200">The Slight:</h3>
        <p className="text-xl italic text-white">{roomData.slight}</p>
      </div>
      
      <h3 className="text-lg font-semibold mb-3">Choose Your Curse:</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3 mb-6">
          {playerHand.map((curse, index) => (
            <div 
              key={index} 
              className={`curse-card animate-pop cursor-pointer ${selectedCurse === curse ? 'border-indigo-500 bg-gray-700' : ''}`}
              onClick={() => setSelectedCurse(curse)}
            >
              <label className="flex items-start cursor-pointer">
                <input 
                  type="radio"
                  name="curse"
                  value={curse}
                  checked={selectedCurse === curse}
                  onChange={() => setSelectedCurse(curse)}
                  className="mt-1 mr-3"
                />
                <span>{curse}</span>
              </label>
            </div>
          ))}
        </div>
        
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="redraw"
            checked={wantRedraw}
            onChange={(e) => setWantRedraw(e.target.checked)}
            className="mr-3"
          />
          <label htmlFor="redraw" className="text-gray-300">
            Redraw my hand (skip this round)
          </label>
        </div>
        
        <button
          type="submit"
          className="btn-primary w-full md:w-auto"
          disabled={submitting || (!selectedCurse && !wantRedraw)}
        >
          {submitting 
            ? 'Submitting...' 
            : wantRedraw 
              ? 'Redraw Hand' 
              : 'Submit Curse'}
        </button>
      </form>
    </div>
  );
};

export default PlayerView;