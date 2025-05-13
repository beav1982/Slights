// Type definitions for the game

export interface GameSession {
  name: string;
  room: string | null;
}

export interface RoomData {
  players: string[];
  judge: string;
  scores: Record<string, number>;
  round: number;
  slight: string;
  submissions: Record<string, string>;
  hands: Record<string, string[]>;
}

export interface CreateRoomForm {
  roomCode: string;
  alias: string;
}

export interface JoinRoomForm {
  roomCode: string;
  alias: string;
}

export interface SubmitCurseForm {
  curse: string;
  redraw: boolean;
}

export interface PickWinnerForm {
  winner: string;
}