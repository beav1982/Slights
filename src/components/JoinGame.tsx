import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useGameStore } from '../lib/store';
import { Users } from 'lucide-react';

const JoinGame: React.FC = () => {
  const [roomCode, setRoomCode] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const joinRoom = useGameStore(state => state.joinRoom);
  const router = useRouter(); // ✅ Replace useNavigate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !alias) {
      setError('Both room code and name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await joinRoom(roomCode.toUpperCase(), alias);
      router.push(`/game/${roomCode.toUpperCase()}`); // ✅ Next.js route change
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Room not found or is invalid. Please check the room code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <div className="flex items-start mb-4 bg-blue-900/30 p-3 rounded-lg">
          <Users className="w-5 h-5 text-blue-400 mr-3 mt-1 flex-shrink-0" />
          <p className="text-sm text-blue-200">
            Join an existing game with a room code from your friend.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="joinRoomCode" className="block mb-2 text-sm font-medium">Room Code</label>
            <input
              type="text"
              id="joinRoomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full"
              placeholder="Enter room code"
              maxLength={6}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="joinAlias" className="block mb-2 text-sm font-medium">Your Name</label>
            <input
              type="text"
              id="joinAlias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full"
              placeholder="Enter your name"
              maxLength={15}
            />
          </div>

          {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGame;
