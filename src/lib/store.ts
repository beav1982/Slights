// src/lib/store.ts

import { create } from 'zustand';
import { kvGet, kvSet, kvDelete } from './redis';
import { drawHand, drawRandom, nextJudge, slights, curses } from '../lib/gameData';
import { GameSession, RoomData } from './types';

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

  setSession: (partial) =>
    set((state) => ({
      session: { ...state.session, ...partial }
    })),

  roomData: null,

  loadRoomData: async (roomCode: string) => {
    const [judge, playersJson, scoresJson, round, slight] = await Promise.all([
      kvGet(`room:${roomCode}:judge`),
      kvGet(`room:${roomCode}:players`),
      kvGet(`room:${roomCode}:scores`),
      kvGet(`room:${roomCode}:round`),
      kvGet(`room:${roomCode}:slight`)
    ]);

    if (!judge || !playersJson || !scoresJson || !round || !slight) {
      throw new Error('Incomplete room data');
    }

    const players = JSON.parse(playersJson);
    const scores = JSON.parse(scoresJson);
    const submissions: Record<string, string> = {};

    await Promise.all(
      players.map(async (player: string) => {
        const submission = await kvGet(`room:${roomCode}:submission:${player}`);
        if (submission) submissions[player] = submission;
      })
    );

    const player = get().session.name;
    const hands: Record<string, string[]> = {};
    if (player) {
      const hand = await kvGet(`room:${roomCode}:hand:${player}`);
      if (hand) hands[player] = JSON.parse(hand);
    }

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
    await kvSet(`room:${code}:judge`, alias);
    await kvSet(`room:${code}:players`, JSON.stringify([alias]));
    await kvSet(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
    await kvSet(`room:${code}:round`, '1');
    await kvSet(`room:${code}:slight`, drawRandom(slights));
    await kvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  joinRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    const [playersJson, scoresJson] = await Promise.all([
      kvGet(`room:${code}:players`),
      kvGet(`room:${code}:scores`)
    ]);

    if (!playersJson || !scoresJson) {
      throw new Error('Room not found');
    }

    const players = JSON.parse(playersJson);
    const scores = JSON.parse(scoresJson);

    if (!players.includes(alias)) {
      players.push(alias);
      scores[alias] = 0;

      await kvSet(`room:${code}:players`, JSON.stringify(players));
      await kvSet(`room:${code}:scores`, JSON.stringify(scores));
      await kvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));
    }

    set({ session: { name: alias, room: code } });
    await get().loadRoomData(code);
  },

  submitCurse: async (curse) => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;

    await kvSet(`room:${session.room}:submission:${session.name}`, curse);
    await loadRoomData(session.room);
    get().playSound('submit');
  },

  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;

    await kvSet(`room:${session.room}:hand:${session.name}`, JSON.stringify(drawHand(curses)));
    await loadRoomData(session.room);
  },

  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData } = get();
    if (!session.room || !roomData) return;

    const scores = { ...roomData.scores };
    scores[winner] = (scores[winner] || 0) + 1;

    await Promise.all([
      kvSet(`room:${session.room}:scores`, JSON.stringify(scores)),
      kvSet(`room:${session.room}:round`, `${roomData.round + 1}`),
      kvSet(`room:${session.room}:slight`, drawRandom(slights)),
      kvSet(`room:${session.room}:judge`, nextJudge(roomData.players, session.name)),
      ...roomData.players.map((player) => kvDelete(`room:${session.room}:submission:${player}`))
    ]);

    get().playSound('win');
    await loadRoomData(session.room);
  },

  playSound: (sound) => {
    const audio = document.getElementById(`${sound}Sound`) as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((e) => console.error('Error playing sound:', e));
    }
  }
}));
