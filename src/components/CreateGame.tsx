import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useGameStore } from '../lib/store';
import { Info } from 'lucide-react';

const CreateGame: React.FC = () => {
  const [roomCode, setRoomCode] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = useGameStore(state => state.createRoom);
  const router = useRouter(); // ✅ Next.js hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !alias) {
      setError('Both room code and name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createRoom(roomCode, alias);
      router.push(`/game/${roomCode.toUpperCase()}`); // ✅ Replace navigate with router.push
    } catch (err) {
      setError('Error creating room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6 mb-6">
        <div className="flex items-start mb-4 bg-indigo-900/30 p-3 rounded-lg">
          <Info className="w-5 h-5 text-indigo-400 mr-3 mt-1 flex-shrink-0" />
          <p className="text-sm text-indigo-200">
            Create a room and share the code with friends. You'll be the first judge.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomCode" className="block mb-2 text-sm font-medium">Room Code</label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full"
              placeholder="e.g. PARTY"
              maxLength={6}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="alias" className="block mb-2 text-sm font-medium">Your Name</label>
            <input
              type="text"
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full"
              placeholder="e.g. CaptainAwesome"
              maxLength={15}
            />
          </div>

          {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGame;
