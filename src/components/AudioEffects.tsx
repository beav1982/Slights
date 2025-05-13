import React from 'react';

const AudioEffects: React.FC = () => {
  return (
    <div className="hidden">
      <audio id="submitSound" src="/sounds/submit.mp3" preload="auto" />
      <audio id="winSound" src="/sounds/win.mp3" preload="auto" />
    </div>
  );
};

export default AudioEffects;