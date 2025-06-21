export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

export interface GameRoom {
  id: string;
  name: string;
  organizer: string;
  organizerAddress: string;
  questions: Question[];
  tokenReward: number;
  tokenSymbol: string;
  status: GameRoomStatus;
  participants: Participant[];
  currentQuestionIndex: number;
  startTime?: number;
}

export type GameRoomStatus = 'setup' | 'waiting' | 'active' | 'completed' | 'cancelled' | 'unknown';

export interface Participant {
  id: string;
  address: string;
  name: string;
  score: number;
  answers: Answer[];
  tokensEarned: number;
}

export interface Answer {
  questionId: string;
  selectedOption: number;
  timeToAnswer: number;
  isCorrect: boolean;
}

export interface User {
  address: string;
  name: string;
  balance: number;
}