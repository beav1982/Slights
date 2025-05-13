import { create } from 'zustand';
import { drawHand, drawRandom, nextJudge, slights, curses } from './gameData';
import { GameSession, RoomData } from './types';

// In a real app, we would use Vercel KV for storage
// but for this demo we'll simulate it with localStorage
const mockStorage = new Map<string, string>();

// Mock KV operations
const mockKV = {
  get: async (key: string): Promise<string | null> => {
    // Try to get from localStorage first for persistence across page reloads
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
    
    return mockStorage.get(key) || null;
  },
  set: async (key: string, value: string): Promise<void> => {
    mockStorage.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  },
  delete: async (key: string): Promise<void> => {
    mockStorage.delete(key);
    localStorage.removeItem(key);
  }
};

interface GameStore {
  // Session
  session: GameSession;
  setSession: (session: Partial<GameSession>) => void;
  
  // Room operations
  createRoom: (roomCode: string, alias: string) => Promise<void>;
  joinRoom: (roomCode: string, alias: string) => Promise<void>;
  
  // Game state
  roomData: RoomData | null;
  loadRoomData: (roomCode: string) => Promise<void>;
  
  // Player actions
  submitCurse: (curse: string) => Promise<void>;
  redrawHand: () => Promise<void>;
  
  // Judge actions
  pickWinner: (winner: string) => Promise<void>;
  
  // Audio
  playSound: (sound: 'submit' | 'win') => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Session state
  session: {
    name: '',
    room: null
  },
  
  setSession: (partialSession) => set((state) => ({
    session: { ...state.session, ...partialSession }
  })),
  
  // Room data
  roomData: null,
  
  // Create a new room
  createRoom: async (roomCode, alias) => {
    const upperRoomCode = roomCode.toUpperCase();
    await mockKV.set(`room:${upperRoomCode}:judge`, alias);
    await mockKV.set(`room:${upperRoomCode}:players`, JSON.stringify([alias]));
    await mockKV.set(`room:${upperRoomCode}:scores`, JSON.stringify({ [alias]: 0 }));
    await mockKV.set(`room:${upperRoomCode}:round`, '1');
    await mockKV.set(`room:${upperRoomCode}:slight`, drawRandom(slights));
    
    // Set hand for the first player
    const hand = drawHand(curses);
    await mockKV.set(`room:${upperRoomCode}:hand:${alias}`, JSON.stringify(hand));
    
    set((state) => ({
      session: {
        ...state.session,
        name: alias,
        room: upperRoomCode
      }
    }));
    
    await get().loadRoomData(upperRoomCode);
  },
  
  // Join an existing room
  joinRoom: async (roomCode, alias) => {
    const upperRoomCode = roomCode.toUpperCase();
    
    // Check if all required room data exists
    const [judge, players, scores, round, slight] = await Promise.all([
      mockKV.get(`room:${upperRoomCode}:judge`),
      mockKV.get(`room:${upperRoomCode}:players`),
      mockKV.get(`room:${upperRoomCode}:scores`),
      mockKV.get(`room:${upperRoomCode}:round`),
      mockKV.get(`room:${upperRoomCode}:slight`)
    ]);

    if (!judge || !players || !scores || !round || !slight) {
      throw new Error('Room not found or is invalid');
    }
    
    const existingPlayers = JSON.parse(players);
    if (!existingPlayers.includes(alias)) {
      existingPlayers.push(alias);
      await mockKV.set(`room:${upperRoomCode}:players`, JSON.stringify(existingPlayers));
      
      // Update scores
      const existingScores = JSON.parse(scores);
      existingScores[alias] = 0;
      await mockKV.set(`room:${upperRoomCode}:scores`, JSON.stringify(existingScores));
      
      // Set hand for new player
      const hand = drawHand(curses);
      await mockKV.set(`room:${upperRoomCode}:hand:${alias}`, JSON.stringify(hand));
    }
    
    set((state) => ({
      session: {
        ...state.session,
        name: alias,
        room: upperRoomCode
      }
    }));
    
    await get().loadRoomData(upperRoomCode);
  },
  
  // Load room data
  loadRoomData: async (roomCode) => {
    const [
      judgeValue,
      playersJson,
      scoresJson,
      roundValue,
      slightValue
    ] = await Promise.all([
      mockKV.get(`room:${roomCode}:judge`),
      mockKV.get(`room:${roomCode}:players`),
      mockKV.get(`room:${roomCode}:scores`),
      mockKV.get(`room:${roomCode}:round`),
      mockKV.get(`room:${roomCode}:slight`)
    ]);
    
    if (!judgeValue || !playersJson || !scoresJson || !roundValue || !slightValue) {
      throw new Error('Room data incomplete');
    }
    
    const players = JSON.parse(playersJson);
    
    // Get all player submissions
    const submissionsPromises = players.map(async (player: string) => {
      const submission = await mockKV.get(`room:${roomCode}:submission:${player}`);
      return { player, submission };
    });
    
    const submissionsResults = await Promise.all(submissionsPromises);
    const submissions: Record<string, string> = {};
    
    submissionsResults.forEach(({ player, submission }) => {
      if (submission) {
        submissions[player] = submission;
      }
    });
    
    // Get current player's hand
    const player = get().session.name;
    const handJson = await mockKV.get(`room:${roomCode}:hand:${player}`);
    const hands: Record<string, string[]> = {};
    
    if (handJson) {
      hands[player] = JSON.parse(handJson);
    }
    
    set({
      roomData: {
        judge: judgeValue,
        players: players,
        scores: JSON.parse(scoresJson),
        round: parseInt(roundValue),
        slight: slightValue,
        submissions,
        hands
      }
    });
  },
  
  // Submit a curse
  submitCurse: async (curse) => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    
    await mockKV.set(`room:${session.room}:submission:${session.name}`, curse);
    await loadRoomData(session.room);
    get().playSound('submit');
  },
  
  // Redraw hand
  redrawHand: async () => {
    const { session, loadRoomData } = get();
    if (!session.room || !session.name) return;
    
    const hand = drawHand(curses);
    await mockKV.set(`room:${session.room}:hand:${session.name}`, JSON.stringify(hand));
    await loadRoomData(session.room);
  },
  
  // Pick a winner
  pickWinner: async (winner) => {
    const { session, roomData, loadRoomData } = get();
    if (!session.room || !roomData) return;
    
    // Update scores
    const scores = { ...roomData.scores };
    scores[winner] = (scores[winner] || 0) + 1;
    await mockKV.set(`room:${session.room}:scores`, JSON.stringify(scores));
    
    // Update round
    await mockKV.set(`room:${session.room}:round`, `${roomData.round + 1}`);
    
    // Set new slight
    await mockKV.set(`room:${session.room}:slight`, drawRandom(slights));
    
    // Rotate judge
    await mockKV.set(`room:${session.room}:judge`, nextJudge(roomData.players, session.name));
    
    // Clear submissions
    await Promise.all(roomData.players.map(player => 
      mockKV.delete(`room:${session.room}:submission:${player}`)
    ));
    
    get().playSound('win');
    await loadRoomData(session.room);
  },
  
  // Play sound effects
  playSound: (sound) => {
    const audio = document.getElementById(`${sound}Sound`) as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error('Error playing sound:', e));
    }
  }
}));