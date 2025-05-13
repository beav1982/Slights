import React, { useEffect } from 'react';
import { Award, Crown } from 'lucide-react';

interface WinningRevealProps {
  winner: string;
  curse: string;
  onClose: () => void;
}

const WinningReveal: React.FC<WinningRevealProps> = ({ winner, curse, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gradient-to-b from-yellow-900/50 to-yellow-950/50 p-8 rounded-lg max-w-2xl w-full mx-4 border border-yellow-500/30 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Crown className="h-12 w-12 text-yellow-400 animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-2">Winning Curse!</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Award className="h-5 w-5 text-yellow-400" />
            <p className="text-xl text-yellow-200">{winner}</p>
          </div>
          <div className="bg-yellow-900/30 p-6 rounded-lg border border-yellow-500/20 mb-6">
            <p className="text-xl italic text-white">{curse}</p>
          </div>
          <p className="text-yellow-200/60 text-sm">Rotating judge in a moment...</p>
        </div>
      </div>
    </div>
  );
};

export default WinningReveal;