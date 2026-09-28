// ==================== GAME TYPES ====================

export interface Game {
  id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  mode: 'solo' | 'team';
  teamCount: number;
  timeLimit: number;
  playerLimit: number;
  randomEvents: boolean;
  actionCards: boolean;
  bossBattle: boolean;
  leaderboard: boolean;
  bossName: string;
  bossHp: number;
  status: 'draft' | 'published' | 'active' | 'completed';
  roomCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mission {
  id: string;
  gameId: string;
  order: number;
  title: string;
  description: string;
  type: 'quiz' | 'matching' | 'sorting' | 'drag-drop' | 'scenario' | 'decision' | 'speed' | 'memory' | 'team';
  xp: number;
  timeLimit: number;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  missionId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  order: number;
}

export interface Player {
  id: string;
  gameId: string;
  nickname: string;
  avatar: string;
  teamId?: string;
  xp: number;
  energy: number;
  correctAnswers: number;
  totalAnswers: number;
  achievements: string[];
  joinedAt: Date;
}

export interface Team {
  id: string;
  gameId: string;
  name: string;
  color: string;
  totalXp: number;
}

export interface GameSession {
  id: string;
  gameId: string;
  status: 'lobby' | 'active' | 'paused' | 'completed';
  currentMissionIndex: number;
  bossHp: number;
  startedAt?: Date;
  endedAt?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

// ==================== API TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== SOCKET TYPES ====================

export interface ServerToClientEvents {
  'game:update': (game: Game) => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'mission:start': (mission: Mission) => void;
  'mission:end': (results: any) => void;
  'boss:update': (hp: number) => void;
  'game:end': (results: any) => void;
}

export interface ClientToServerEvents {
  'game:join': (data: { gameId: string; player: Partial<Player> }) => void;
  'game:leave': (data: { gameId: string; playerId: string }) => void;
  'mission:answer': (data: { gameId: string; playerId: string; answer: number }) => void;
  'boss:attack': (data: { gameId: string; damage: number }) => void;
}
