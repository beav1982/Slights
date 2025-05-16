// src/lib/store.ts

import { create } from 'zustand';
// IMPORTANT: Assuming your updated redis.ts exports functions like clientKvGet, clientKvSet, clientKvDelete
// which internally call your Next.js API routes (e.g., /api/kv/set)
import { clientKvGet, clientKvSet } from './redis';
import { HAND_SIZE, curses, drawHand, drawRandom } from '../lib/gameData';
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
    console.log(`[store.ts] loadRoomData: Loading room ${roomCode}`);
    try {
      const [judge, playersJson, scoresJson, round, slight] = await Promise.all([
        clientKvGet(`room:${roomCode}:judge`), // Using clientKvGet
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
          const submission = await clientKvGet(`room:${roomCode}:submission:${player}`); // Using clientKvGet
          if (submission) submissions[player] = submission;
        })
      );

      const currentPlayerName = get().session.name;
      const hands: Record<string, string[]> = {};
      if (currentPlayerName) { // Ensure player name exists before fetching hand
        const hand = await clientKvGet(`room:${roomCode}:hand:${currentPlayerName}`); // Using clientKvGet
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
      // Optionally, clear roomData or set an error state here
      set({ roomData: null }); // Clear room data on error
      throw error; // Re-throw for UI to handle
    }
  },

  createRoom: async (roomCode, alias) => {
    const code = roomCode.toUpperCase();
    console.log(`[store.ts] createRoom: Attempting for room ${code}, alias ${alias}`);
    try {
      await clientKvSet(`room:${code}:judge`, alias); // Using clientKvSet
      await clientKvSet(`room:${code}:players`, JSON.stringify([alias]));
      await clientKvSet(`room:${code}:scores`, JSON.stringify({ [alias]: 0 }));
      await clientKvSet(`room:${code}:round`, '1');
      await clientKvSet(`room:${code}:slight`, drawRandom(slights));
      await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));
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
        clientKvGet(`room:${code}:players`), // Using clientKvGet
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

        await clientKvSet(`room:${code}:players`, JSON.stringify(players)); // Using clientKvSet
        await clientKvSet(`room:${code}:scores`, JSON.stringify(scores));
        await clientKvSet(`room:${code}:hand:${alias}`, JSON.stringify(drawHand(curses)));
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
    // 1. Save the submitted curse
    await clientKvSet(`room:${session.room}:submission:${session.name}`, curse);

    // 2. Get current hand
    const handRaw = await clientKvGet(`room:${session.room}:hand:${session.name}`);
    let hand = handRaw ? JSON.parse(handRaw) : [];

    // 3. Remove submitted curse from hand (first occurrence only)
    const submittedIndex = hand.indexOf(curse);
    if (submittedIndex !== -1) hand.splice(submittedIndex, 1);

    // 4. Draw a new curse (avoiding current hand if possible) to get back to HAND_SIZE
    if (hand.length < HAND_SIZE) {
      // Exclude already-in-hand cards from pool
      const possibleCurses = curses.filter(c => !hand.includes(c));
      // Fallback to full deck if not enough left
      const newCurse = drawRandom(possibleCurses.length > 0 ? possibleCurses : curses);
      if (newCurse) hand.push(newCurse);
    }

    // 5. Save updated hand
    await clientKvSet(`room:${session.room}:hand:${session.name}`, JSON.stringify(hand));

    // 6. Reload room data and play sound
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
    // Draw a completely new hand of HAND_SIZE
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
    if (!session.room || !roomData || !session.name) return; // Added session.name check
    console.log(`[store.ts] pickWinner: Judge ${session.name} picking ${winner} in room ${session.room}`);
    try {
      const scores = { ...roomData.scores };
      scores[winner] = (scores[winner] || 0) + 1;
// Save the winning player and curse for Winner Reveal modal (so all players can see it)
await clientKvSet(
  `room:${session.room}:lastWinner`,
  JSON.stringify({
    winner,
    curse: roomData.submissions[winner], // get the winning curse text from the submissions
  })
);
      await Promise.all([
        clientKvSet(`room:${session.room}:scores`, JSON.stringify(scores)), // Using clientKvSet
        clientKvSet(`room:${session.room}:round`, `${roomData.round + 1}`),
        clientKvSet(`room:${session.room}:slight`, drawRandom(slights)),
        clientKvSet(`room:${session.room}:judge`, nextJudge(roomData.players, roomData.judge)), // judge should be current judge from roomData
        ...roomData.players.map((player) => clientKvDelete(`room:${session.room}:submission:${player}`)) // Using clientKvDelete
      ]);

      playSound('win');
      await loadRoomData(session.room);
    } catch (error) {
      console.error(`[store.ts] pickWinner: Error in room ${session.room}:`, error);
      throw error;
    }
  },

  playSound: (sound) => {
    // This will only work if called from client-side hydrated component
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