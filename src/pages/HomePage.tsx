import React, { useState } from 'react';
import CreateGame from '../components/CreateGame';
import JoinGame from '../components/JoinGame';
import { Zap } from 'lucide-react';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <div className="mb-4 inline-block p-3 bg-indigo-900/30 rounded-full">
          <Zap className="h-12 w-12 text-yellow-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">
          Slights
        </h1>
        <p className="text-xl text-gray-300 mb-2">A Game of Minor Inconveniences</p>
        <p className="text-gray-400 max-w-lg mx-auto">
          Create a room, invite friends with the room code, submit curse cards, and vote for the best ones!
        </p>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="bg-gray-800 rounded-lg p-1 flex">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'create' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-transparent text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create Game
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'join' 
                ? 'bg-blue-600 text-white' 
                : 'bg-transparent text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('join')}
          >
            Join Game
          </button>
        </div>
      </div>
      
      {activeTab === 'create' ? <CreateGame /> : <JoinGame />}
      
      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>© 2025 Slights Game • A game of minor inconveniences</p>
      </div>
    </div>
  );
};

export default HomePage;