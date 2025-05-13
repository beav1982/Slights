import { create } from 'zustand';
import { Howl } from 'howler';

type SoundName = 'win' | 'click' | 'submit' | 'error';

interface SoundStore {
  playSound: (name: SoundName) => void;
}

const sounds: Record<SoundName, Howl> = {
  win: new Howl({ src: ['/sounds/win.mp3'] }),
  click: new Howl({ src: ['/sounds/click.mp3'] }),
  submit: new Howl({ src: ['/sounds/submit.mp3'] }),
  error: new Howl({ src: ['/sounds/error.mp3'] }),
};

export const useSoundStore = create<SoundStore>(() => ({
  playSound: (name) => {
    const sound = sounds[name];
    if (sound) sound.play();
  },
}));
