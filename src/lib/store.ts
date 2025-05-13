// src/lib/store.ts

import { create } from 'zustand';
import { drawHand, drawRandom, nextJudge, slights, curses } from './gameData';
import { GameSession, RoomData } from './types';

const mockStorage = new Map<string, string>();

const mockKV = {
  get: async (key: string): Promise<string | null> => {
    const localValue = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return localValue ?? mockStorage.get(key) ?? null;
  },
  set: async (key: string, value: string): Promise<void> => {
    mockStorage.set(key, value);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  },
  delete: async (key: string): Promise<void> => {
    mockStorage.delete(key);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

interface GameStore {
  session: GameSession;
  setSession: (session: Partial<GameSession>) => void;

  roomData: RoomData | null;
  loadRoomData: (roomCode: string) => Promise<void>;

  createRoom: (roomCode: string, alias: string) => Promise<void>;
  joinRoom: (roomCode: string, alias: string) => Promise<void>;

  submitCurse: (curse: string) => Promise<void>;
  redrawHand: () => Promise<void>;
  pickWinner: (winner: string) => Promise<void>;

  playSound: (sound: 'submit' | 'win') => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: {
    name: '',
    room: null
  },

  setSession: (partial) => set((state) => ({
    session: { ...state.session, ...partial }
  })),

  roomData: null,

  loadRoomData: async (roomCode: string) => {
    const [judge, playersJson, scoresJson, round, slight] = await Promise.all([
      mockKV.get(`room:${roomCode}:judge`),
      mockKV.get(`room:${roomCode}:players`),
      mockKV.get(`room:${roomCode}:scores`),
      mockKV.get(`room:${roomCode}:round`),
      mockKV.get(`room:${roomCode}:slight`)
    ]);

    if (!judge || !playersJson || !scoresJson || !round || !slight) throw new Error('Incomplete room data');

    const players = JSON.parse(playersJson);
    const scores = JSON.parse(scoresJson);

    const submissions: Record<string, string> = {};
    await Promise.all(
      players.map(async (player: string) => {
        const submission = await mockKV.get(`room:${roomCode}:submission:${player}`);
        if (submission) submissions[player] = submission;
      })
    );

    const player = get().session.name;
    const hands: Record<string, string[]> = {};
    const hand = await mockKV.get(`room:${roomCode}:hand:${player}`);
    if (hand) hands[player] = JSON.parse(hand);

    set({
      roomData: {
        judge,
        players,
        scores,
        round: parseInt(round),
        slight,
        submissions,
        hands
      }
    });
  },

  createRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    await mockKV.set(`room:${code}:judge`, alias);
    await mockKV.set(`room:${code}:players`, JSON.stringify([alias]));
    await mockKV.set(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
    await mockKV.set(`room:${code}:round`, '1');
    await mockKV.set(`room:${code}:slight`, drawRandom(slights));
    await mockKV.set(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  joinRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    const [playersJson, scoresJson] = await Promise.all([
      mockKV.get(`room:${code}:players`),
      mockKV.get(`room:${code}:scores`)
    ]);

    if (!playersJson || !scoresJson) throw new Error('Room not found');

    const players = JSON.parse(playersJson);
    const scores = JSON.parse(scoresJson);

    if (!players.includes(alias)) {
      players.push(alias);
      scores[alias] = 0;
      await mockKV.set(`room:${code}:players`, JSON.stringify(players));
      await mockKV.set(`room:${code}:scores`, JSON.stringify(scores));
      await mockKV.set(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));
    }

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  submitCurse: async (curse) => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    await mockKV.set(`room:${session.room}:submission:${session.name}`, curse);
    await loadRoomData(session.room);
    get().playSound('submit');
  },

  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    await mockKV.set(`room:${session.room}:hand:${session.name}`, JSON.stringify(drawHand(curses)));
    await loadRoomData(session.room);
  },

  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData } = get();
    if (!session.room || !roomData) return;

    const scores = { ...roomData.scores };
    scores[winner] = (scores[winner] || 0) + 1;
    await mockKV.set(`room:${session.room}:scores`, JSON.stringify(scores));
    await mockKV.set(`room:${session.room}:round`, `${roomData.round + 1}`);
    await mockKV.set(`room:${session.room}:slight`, drawRandom(slights));
    await mockKV.set(`room:${session.room}:judge`, nextJudge(roomData.players, session.name));

    await Promise.all(
      roomData.players.map(player => mockKV.delete(`room:${session.room}:submission:${player}`))
    );

    get().playSound('win');
    await loadRoomData(session.room);
  },

  playSound: (sound) => {
    const audio = document.getElementById(`${sound}Sound`) as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error('Error playing sound:', e));
    }
  }
}));
