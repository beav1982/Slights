// src/lib/store.ts

import { create } from 'zustand';
import { clientKvGet, clientKvSet, clientKvDelete } from './redis';
import { HAND_SIZE, curses, drawHand, drawRandom, nextJudge, slights } from '../lib/gameData';
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

  playSound: (sound: 'submit' | 'win' | 'error' | 'click') => void;
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
    console.log(`[store.ts] loadRoomData: Loading room ${roomCode}`);
    try {
      const keys = [
        `room:${roomCode}:judge`,
        `room:${roomCode}:players`,
        `room:${roomCode}:scores`,
        `room:${roomCode}:round`,
        `room:${roomCode}:slight`,
      ];
      const [judge, playersJson, scoresJson, round, slight] = await Promise.all(
        keys.map(k => clientKvGet(k))
      );

      if ([judge, playersJson, scoresJson, round, slight].some(v => !v)) {
        console.error(`[store.ts] loadRoomData: Incomplete room data for ${roomCode}`);
        throw new Error('Incomplete room data');
      }

      const players = JSON.parse(playersJson as string);
      const scores = JSON.parse(scoresJson as string);
      const submissions: Record<string, string> = {};

      await Promise.all(
        players.map(async (player: string) => {
          const submission = await clientKvGet(`room:${roomCode}:submission:${player}`);
          if (submission) submissions[player] = submission;
        })
      );

      const currentPlayerName = get().session.name;
      const hands: Record<string, string[]> = {};
      if (currentPlayerName) {
        const hand = await clientKvGet(`room:${roomCode}:hand:${currentPlayerName}`);
        if (hand) hands[currentPlayerName] = JSON.parse(hand);
      }

      set({
        roomData: {
          judge: judge as string,
          players,
          scores,
          round: parseInt(round as string, 10),
          slight: slight as string,
          submissions,
          hands
        }
      });
      console.log(`[store.ts] loadRoomData: Room ${roomCode} data set in store.`);
    } catch (error) {
      console.error(`[store.ts] loadRoomData: Failed for room ${roomCode}:`, error);
      set({ roomData: null });
      throw error;
    }
  },

  createRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    console.log(`[store.ts] createRoom: Attempting for room ${code}, alias ${alias}`);
    try {
      await clientKvSet(`room:${code}:judge`, alias);
      await clientKvSet(`room:${code}:players`, JSON.stringify([alias]));
      await clientKvSet(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
      await clientKvSet(`room:${code}:round`, '1');
      await clientKvSet(`room:${code}:slight`, drawRandom(slights));
      await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses, HAND_SIZE)));
      console.log(`[store.ts] createRoom: All KV operations complete for room ${code}`);

      set({ session: { name: alias, room: code } });
      await get().loadRoomData(code);
    } catch (error) {
      console.error(`[store.ts] createRoom: Error for room ${code}:`, error);
      throw error;
    }
  },

  joinRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    console.log(`[store.ts] joinRoom: Attempting for room ${code}, alias ${alias}`);
    try {
      const [playersJson, scoresJson] = await Promise.all([
        clientKvGet(`room:${code}:players`),
        clientKvGet(`room:${code}:scores`)
      ]);

      if (!playersJson || !scoresJson) {
        console.error(`[store.ts] joinRoom: Room ${code} not found or data incomplete.`);
        throw new Error('Room not found');
      }

      const players = JSON.parse(playersJson);
      const scores = JSON.parse(scoresJson);

      if (!players.includes(alias)) {
        players.push(alias);
        scores[alias] = 0;

        await clientKvSet(`room:${code}:players`, JSON.stringify(players));
        await clientKvSet(`room:${code}:scores`, JSON.stringify(scores));
        await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses, HAND_SIZE)));
      }
      console.log(`[store.ts] joinRoom: Successfully processed join for ${alias} in room ${code}`);

      set({ session: { name: alias, room: code } });
      await get().loadRoomData(code);
    } catch (error) {
      console.error(`[store.ts] joinRoom: Error for room ${code} with alias ${alias}:`, error);
      throw error;
    }
  },

  submitCurse: async (curse) => {
    const { session, loadRoomData, playSound } = get();
    if (!session.room || !session.name) return;
    console.log(`[store.ts] submitCurse: ${session.name} submitting '${curse}' for room ${session.room}`);
    try {
      await clientKvSet(`room:${session.room}:submission:${session.name}`, curse);

      const handRaw = await clientKvGet(`room:${session.room}:hand:${session.name}`);
      const hand = handRaw ? JSON.parse(handRaw) : [];

      const submittedIndex = hand.indexOf(curse);
      if (submittedIndex !== -1) hand.splice(submittedIndex, 1);

      if (hand.length < HAND_SIZE) {
        const possibleCurses = curses.filter(c => !hand.includes(c));
        const newCurse = drawRandom(possibleCurses.length > 0 ? possibleCurses : curses);
        if (newCurse) hand.push(newCurse);
      }

      await clientKvSet(`room:${session.room}:hand:${session.name}`, JSON.stringify(hand));

      await loadRoomData(session.room);
      playSound('submit');
    } catch (error) {
      console.error(`[store.ts] submitCurse: Error for ${session.name} in room ${session.room}:`, error);
      throw error;
    }
  },

  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    console.log(`[store.ts] redrawHand: ${session.name} redrawing hand for room ${session.room}`);
    try {
      await clientKvSet(
        `room:${session.room}:hand:${session.name}`,
        JSON.stringify(drawHand(curses, HAND_SIZE))
      );
      await loadRoomData(session.room);
    } catch (error) {
      console.error(`[store.ts] redrawHand: Error for ${session.name} in room ${session.room}:`, error);
      throw error;
    }
  },

  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData, playSound } = get();
    if (!session.room || !roomData || !session.name) return;
    console.log(`[store.ts] pickWinner: Judge ${session.name} picking ${winner} in room ${session.room}`);
    try {
      const scores = { ...roomData.scores };
      scores[winner] = (scores[winner] || 0) + 1;

      await clientKvSet(
        `room:${session.room}:lastWinner`,
        JSON.stringify({
          winner,
          curse: roomData.submissions[winner],
        })
      );

      await Promise.all([
        clientKvSet(`room:${session.room}:scores`, JSON.stringify(scores)),
        clientKvSet(`room:${session.room}:round`, `${roomData.round + 1}`),
        clientKvSet(`room:${session.room}:slight`, drawRandom(slights)),
        clientKvSet(`room:${session.room}:judge`, nextJudge(roomData.players, roomData.judge)),
        ...roomData.players.map((player) => clientKvDelete(`room:${session.room}:submission:${player}`))
      ]);

      playSound('win');
      await loadRoomData(session.room);
    } catch (error) {
      console.error(`[store.ts] pickWinner: Error in room ${session.room}:`, error);
      throw error;
    }
  },

  playSound: (sound) => {
    if (typeof document !== 'undefined') {
      const audio = document.getElementById(`${sound}Sound`) as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((e) => console.error('Error playing sound:', e));
      } else {
        console.warn(`[store.ts] playSound: Audio element '${sound}Sound' not found.`);
      }
    } else {
      console.warn(`[store.ts] playSound: Attempted to play sound in non-browser environment.`);
    }
  }
}));
