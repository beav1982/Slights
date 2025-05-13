// src/lib/store.ts

import { create } from 'zustand';
import { drawHand, drawRandom, nextJudge, slights, curses } from '../lib/gameData';
import { GameSession, RoomData } from '../lib/types';
import { kv } from '@vercel/kv';

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
      kv.get(`room:${roomCode}:judge`),
      kv.get(`room:${roomCode}:players`),
      kv.get(`room:${roomCode}:scores`),
      kv.get(`room:${roomCode}:round`),
      kv.get(`room:${roomCode}:slight`)
    ]);

    if (!judge || !playersJson || !scoresJson || !round || !slight) throw new Error('Incomplete room data');

    const players = JSON.parse(playersJson as string);
    const scores = JSON.parse(scoresJson as string);

    const submissions: Record<string, string> = {};
    await Promise.all(
      players.map(async (player: string) => {
        const submission = await kv.get(`room:${roomCode}:submission:${player}`);
        if (submission) submissions[player] = submission as string;
      })
    );

    const player = get().session.name;
    const hands: Record<string, string[]> = {};
    const hand = await kv.get(`room:${roomCode}:hand:${player}`);
    if (hand) hands[player] = JSON.parse(hand as string);

    set({
      roomData: {
        judge: judge as string,
        players,
        scores,
        round: parseInt(round as string),
        slight: slight as string,
        submissions,
        hands
      }
    });
  },

  createRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    await kv.set(`room:${code}:judge`, alias);
    await kv.set(`room:${code}:players`, JSON.stringify([alias]));
    await kv.set(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
    await kv.set(`room:${code}:round`, '1');
    await kv.set(`room:${code}:slight`, drawRandom(slights));
    await kv.set(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  joinRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    const [playersJson, scoresJson] = await Promise.all([
      kv.get(`room:${code}:players`),
      kv.get(`room:${code}:scores`)
    ]);

    if (!playersJson || !scoresJson) throw new Error('Room not found');

    const players = JSON.parse(playersJson as string);
    const scores = JSON.parse(scoresJson as string);

    if (!players.includes(alias)) {
      players.push(alias);
      scores[alias] = 0;
      await kv.set(`room:${code}:players`, JSON.stringify(players));
      await kv.set(`room:${code}:scores`, JSON.stringify(scores));
      await kv.set(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));
    }

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  submitCurse: async (curse) => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    await kv.set(`room:${session.room}:submission:${session.name}`, curse);
    await loadRoomData(session.room);
    get().playSound('submit');
  },

  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    await kv.set(`room:${session.room}:hand:${session.name}`, JSON.stringify(drawHand(curses)));
    await loadRoomData(session.room);
  },

  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData } = get();
    if (!session.room || !roomData) return;

    const scores = { ...roomData.scores };
    scores[winner] = (scores[winner] || 0) + 1;
    await kv.set(`room:${session.room}:scores`, JSON.stringify(scores));
    await kv.set(`room:${session.room}:round`, `${roomData.round + 1}`);
    await kv.set(`room:${session.room}:slight`, drawRandom(slights));
    await kv.set(`room:${session.room}:judge`, nextJudge(roomData.players, session.name));

    await Promise.all(
      roomData.players.map(player => kv.del(`room:${session.room}:submission:${player}`))
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
