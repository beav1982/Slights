// src/lib/store.ts

import { create } from 'zustand';
// IMPORTANT: Assuming your updated redis.ts exports functions like clientKvGet, clientKvSet, clientKvDelete
import { clientKvGet, clientKvSet, clientKvDelete } from './redis';
import { HAND_SIZE, curses, drawHand, drawRandom, nextJudge, slights } from '../lib/gameData';
import { GameSession, RoomData } from './types';

// --- Unique Hand Helper ---
function drawUniqueHand(
  allCurses: string[],
  alreadyDealt: string[],
  handSize: number
): string[] {
  const available = allCurses.filter((c) => !alreadyDealt.includes(c));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  if (shuffled.length < handSize) {
    // Fallback: allow repeats if not enough left (MVP safety)
    const reshuffled = [...allCurses].sort(() => Math.random() - 0.5);
    return reshuffled.slice(0, handSize);
  }
  return shuffled.slice(0, handSize);
}

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
    console.log(`[store.ts] loadRoomData: Loading room ${roomCode}`);
    try {
      const [judge, playersJson, scoresJson, round, slight] = await Promise.all([
        clientKvGet(`room:${roomCode}:judge`),
        clientKvGet(`room:${roomCode}:players`),
        clientKvGet(`room:${roomCode}:scores`),
        clientKvGet(`room:${roomCode}:round`),
        clientKvGet(`room:${roomCode}:slight`)
      ]);

      console.log(`[store.ts] loadRoomData - Fetched from KV:`, { judge, playersJson, scoresJson, round, slight });

      if (!judge || !playersJson || !scoresJson || !round || !slight) {
        console.error(`[store.ts] loadRoomData: Incomplete room data for ${roomCode}`);
        throw new Error('Incomplete room data');
      }

      const players = JSON.parse(playersJson);
      const scores = JSON.parse(scoresJson);
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
          judge,
          players,
          scores,
          round: parseInt(round),
          slight,
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

  // ---- ROOM CREATION ----
  createRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    console.log(`[store.ts] createRoom: Attempting for room ${code}, alias ${alias}`);
    try {
      await clientKvSet(`room:${code}:judge`, alias);
      await clientKvSet(`room:${code}:players`, JSON.stringify([alias]));
      await clientKvSet(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
      await clientKvSet(`room:${code}:round`, '1');
      await clientKvSet(`room:${code}:slight`, drawRandom(slights));

      // Unique hand logic
      const initialHand = drawUniqueHand(curses, [], HAND_SIZE);
      await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(initialHand));
      await clientKvSet(`room:${code}:dealtCurses`, JSON.stringify(initialHand));

      console.log(`[store.ts] createRoom: All KV operations complete for room ${code}`);
      set({ session: { name: alias, room: code } });
      await get().loadRoomData(code);
    } catch (error) {
      console.error(`[store.ts] createRoom: Error for room ${code}:`, error);
      throw error;
    }
  },

  // ---- JOIN ROOM ----
  joinRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    console.log(`[store.ts] joinRoom: Attempting for room ${code}, alias ${alias}`);
    try {
      const [playersJson, scoresJson] = await Promise.all([
        clientKvGet(`room:${code}:players`),
        clientKvGet(`room:${code}:scores`)
      ]);

      console.log(`[store.ts] joinRoom - Fetched from KV:`, { playersJson, scoresJson });

      if (!playersJson || !scoresJson) {
        console.error(`[store.ts] joinRoom: Room ${code} not found or data incomplete.`);
        throw new Error('Room not found');
      }

      const players = JSON.parse(playersJson);
      const scores = JSON.parse(scoresJson);

      if (!players.includes(alias)) {
        players.push(alias);
        scores[alias] = 0;

        // Unique hand logic for joining
        const dealtRaw = await clientKvGet(`room:${code}:dealtCurses`);
        let dealtCurses: string[] = dealtRaw ? JSON.parse(dealtRaw) : [];
        const newHand = drawUniqueHand(curses, dealtCurses, HAND_SIZE);
        dealtCurses = dealtCurses.concat(newHand);

        await clientKvSet(`room:${code}:players`, JSON.stringify(players));
        await clientKvSet(`room:${code}:scores`, JSON.stringify(scores));
        await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(newHand));
        await clientKvSet(`room:${code}:dealtCurses`, JSON.stringify(dealtCurses));
      }
      console.log(`[store.ts] joinRoom: Successfully processed join for ${alias} in room ${code}`);

      set({ session: { name: alias, room: code } });
      await get().loadRoomData(code);
    } catch (error) {
      console.error(`[store.ts] joinRoom: Error for room ${code} with alias ${alias}:`, error);
      throw error;
    }
  },

  // ---- SUBMIT CURSE ----
  submitCurse: async (curse) => {
    const { session, loadRoomData, playSound } = get();
    if (!session.room || !session.name) return;
    console.log(`[store.ts] submitCurse: ${session.name} submitting '${curse}' for room ${session.room}`);
    try {
      // Save the submitted curse
      await clientKvSet(`room:${session.room}:submission:${session.name}`, curse);

      // Unique discard/replace logic
      const handRaw = await clientKvGet(`room:${session.room}:hand:${session.name}`);
      let hand = handRaw ? JSON.parse(handRaw) : [];
      // Remove submitted curse from hand (first occurrence)
      const submittedIndex = hand.indexOf(curse);
      if (submittedIndex !== -1) hand.splice(submittedIndex, 1);

      // Update dealtCurses (remove old hand, add new curse)
      const dealtRaw = await clientKvGet(`room:${session.room}:dealtCurses`);
      let dealtCurses: string[] = dealtRaw ? JSON.parse(dealtRaw) : [];
      dealtCurses = dealtCurses.filter(c => !hand.includes(c) && c !== curse);

      // Draw new unique curse to refill to HAND_SIZE
      if (hand.length < HAND_SIZE) {
        const notDealt = curses.filter(c => !hand.includes(c) && !dealtCurses.includes(c));
        const newCurse = drawRandom(notDealt.length > 0 ? notDealt : curses);
        if (newCurse) {
          hand.push(newCurse);
          dealtCurses.push(newCurse);
        }
      }

      await clientKvSet(`room:${session.room}:hand:${session.name}`, JSON.stringify(hand));
      await clientKvSet(`room:${session.room}:dealtCurses`, JSON.stringify(dealtCurses));
      await loadRoomData(session.room);
      playSound('submit');
    } catch (error) {
      console.error(`[store.ts] submitCurse: Error for ${session.name} in room ${session.room}:`, error);
      throw error;
    }
  },

  // ---- REDRAW HAND ----
  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    console.log(`[store.ts] redrawHand: ${session.name} redrawing hand for room ${session.room}`);
    try {
      // Remove player's old hand from dealtCurses
      const dealtRaw = await clientKvGet(`room:${session.room}:dealtCurses`);
      let dealtCurses: string[] = dealtRaw ? JSON.parse(dealtRaw) : [];
      const oldHandRaw = await clientKvGet(`room:${session.room}:hand:${session.name}`);
      const oldHand = oldHandRaw ? JSON.parse(oldHandRaw) : [];
      dealtCurses = dealtCurses.filter(c => !oldHand.includes(c));

      // Draw new unique hand
      const newHand = drawUniqueHand(curses, dealtCurses, HAND_SIZE);
      dealtCurses = dealtCurses.concat(newHand);

      await clientKvSet(
        `room:${session.room}:hand:${session.name}`,
        JSON.stringify(newHand)
      );
      await clientKvSet(
        `room:${session.room}:dealtCurses`,
        JSON.stringify(dealtCurses)
      );
      await loadRoomData(session.room);
    } catch (error) {
      console.error(`[store.ts] redrawHand: Error for ${session.name} in room ${session.room}:`, error);
      throw error;
    }
  },

  // ---- PICK WINNER & RESET DEALT ----
  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData, playSound } = get();
    if (!session.room || !roomData || !session.name) return;
    console.log(`[store.ts] pickWinner: Judge ${session.name} picking ${winner} in room ${session.room}`);
    try {
      const scores = { ...roomData.scores };
      scores[winner] = (scores[winner] || 0) + 1;

      // Winner Reveal
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
        ...roomData.players.map((player) => clientKvDelete(`room:${session.room}:submission:${player}`)),
        // --- RESET dealtCurses for next round! ---
        clientKvSet(`room:${session.room}:dealtCurses`, JSON.stringify([])),
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
