import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../lib/store';
import { useSoundStore } from '../stores/useSoundStore';
import { clientKvGet } from '../lib/redis';
import WinningReveal from './WinningReveal';
import ScoreboardModal from './ScoreboardModal';

const JudgeView: React.FC = () => {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerData, setWinnerData] = useState<{ winner: string; curse: string } | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const winnerRef = useRef<string | null>(null);
  const soundPlayedRef = useRef(false);

  const session = useGameStore(state => state.session);
  const roomData = useGameStore(state => state.roomData);
  const pickWinner = useGameStore(state => state.pickWinner);
  const loadRoomData = useGameStore(state => state.loadRoomData);

  const playSound = useSoundStore(state => state.playSound);

  // Poll for winner updates every second
  useEffect(() => {
    if (!session.room) return;

    const interval = setInterval(async () => {
      try {
        const result = await clientKvGet(`room:${session.room}:lastWinner`);
        if (result) {
          const data = JSON.parse(result);
          if (winnerRef.current !== data.winner) {
            winnerRef.current = data.winner;
            setWinnerData(data);
            setShowWinner(true);
            if (!soundPlayedRef.current) {
              playSound('win');
              soundPlayedRef.current = true;
            }
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      winnerRef.current = null;
      soundPlayedRef.current = false;
    };
  }, [session.room, playSound]);

  // Poll room data every 5 seconds
  useEffect(() => {
    if (!session.room) return;
    const intervalId = setInterval(() => {
      loadRoomData(session.room).catch(console.error);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [session.room, loadRoomData]);

  if (!roomData || !session.name) return null;

  // Winner Reveal Modal
  if (showWinner && winnerData) {
    return (
      <WinningReveal
        winner={winnerData.winner}
        curse={winnerData.curse}
        onClose={() => {
          setShowWinner(false);
          setWinnerData(null);
          setShowScoreboard(true); // Show scoreboard after closing winner modal
        }}
      />
    );
  }

  // Scoreboard Modal (stay until user closes)
  if (showScoreboard) {
    return (
      <ScoreboardModal
        scores={roomData.scores}
        judge={roomData.judge}
        onClose={() => {
          setShowScoreboard(false);
          winnerRef.current = null;
          soundPlayedRef.current = false;
        }}
      />
    );
  }

  const submissions = Object.entries(roomData.submissions)
    .filter(([player]) => player !== roomData.judge)
    .map(([player, curse], idx) => ({
      key: player,
      curse,
      anonymizedId: `Card #${idx + 1}`,
    }));

  const allSubmitted =
    submissions.length === roomData.players.length - 1 &&
    submissions.every(s => s.curse);

  const handlePickWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinner) return;
    setSubmitting(true);
    try {
      await pickWinner(selectedWinner);
      playSound('win');
    } catch (err) {
      console.error('Error picking winner:', err);
      playSound('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="slight-card mb-8">
        <h3 className="text-xl font-semibold mb-2 text-indigo-200">The Slight:</h3>
        <p className="text-xl italic text-white">{roomData.slight}</p>
      </div>

      <h3 className="text-lg font-semibold mb-3">Submitted Curses:</h3>
      {submissions.length === 0 ? (
        <p className="italic text-gray-400 mb-8">Waiting for players to submit...</p>
      ) : (
        <form onSubmit={handlePickWinner}>
          <div className="grid gap-3 mb-6">
            {submissions.map(submission => (
              <div
                key={submission.key}
                className={`curse-card cursor-pointer ${
                  selectedWinner === submission.key ? 'border-yellow-500 bg-yellow-900/30' : ''
                }`}
                onClick={() => setSelectedWinner(submission.key)}
              >
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="winner"
                    value={submission.key}
                    checked={selectedWinner === submission.key}
                    onChange={() => setSelectedWinner(submission.key)}
                    className="mt-1 mr-3"
                  />
                  <span>
                    <span className="font-bold text-yellow-300">{submission.anonymizedId}</span>: {submission.curse}
                  </span>
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="btn-primary w-full md:w-auto"
            disabled={submitting || !selectedWinner || !allSubmitted}
          >
            {submitting ? 'Picking Winner...' : 'Pick Winner'}
          </button>
        </form>
      )}
    </div>
  );
};

export default JudgeView;
