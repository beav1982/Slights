import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="text-center p-10 font-sans">
      <h1 className="text-4xl font-bold mb-4">Welcome to Slights!</h1>
      <p className="text-lg text-gray-200 mb-6">Select Host or Join to begin.</p>

      <div className="flex justify-center gap-6">
        <Link href="/game/host">
          <button className="btn-primary">Host Game</button>
        </Link>
        <Link href="/game/join">
          <button className="btn-success">Join Game</button>
        </Link>
      </div>
    </div>
  );
}
