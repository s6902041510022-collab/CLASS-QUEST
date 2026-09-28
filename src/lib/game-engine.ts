import { Game, Mission, Player, Team, GameSession } from '@/types';
import { generateId, generateRoomCode, shuffleArray, TEAM_COLORS } from './utils';

// ==================== GAME ENGINE ====================

export class GameEngine {
  private games: Map<string, Game> = new Map();
  private missions: Map<string, Mission[]> = new Map();
  private players: Map<string, Player[]> = new Map();
  private teams: Map<string, Team[]> = new Map();
  private sessions: Map<string, GameSession> = new Map();

  // ==================== GAME CRUD ====================

  createGame(data: Partial<Game>): Game {
    const game: Game = {
      id: generateId(),
      name: data.name || 'New Game',
      subject: data.subject || 'General',
      topic: data.topic || 'General',
      description: data.description || '',
      mode: data.mode || 'solo',
      teamCount: data.teamCount || 2,
      timeLimit: data.timeLimit || 300,
      playerLimit: data.playerLimit || 40,
      randomEvents: data.randomEvents || false,
      actionCards: data.actionCards || false,
      bossBattle: data.bossBattle !== false,
      leaderboard: data.leaderboard !== false,
      bossName: data.bossName || 'Monster',
      bossHp: data.bossHp || 1000,
      status: 'draft',
      roomCode: generateRoomCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.games.set(game.id, game);
    this.missions.set(game.id, []);
    this.players.set(game.id, []);
    this.teams.set(game.id, []);
    
    return game;
  }

  getGame(id: string): Game | undefined {
    return this.games.get(id);
  }

  getGameByRoomCode(roomCode: string): Game | undefined {
    return Array.from(this.games.values()).find(g => g.roomCode === roomCode);
  }

  updateGame(id: string, data: Partial<Game>): Game | undefined {
    const game = this.games.get(id);
    if (!game) return undefined;

    const updated = { ...game, ...data, updatedAt: new Date() };
    this.games.set(id, updated);
    return updated;
  }

  deleteGame(id: string): boolean {
    this.games.delete(id);
    this.missions.delete(id);
    this.players.delete(id);
    this.teams.delete(id);
    return true;
  }

  publishGame(id: string): Game | undefined {
    return this.updateGame(id, { status: 'published' });
  }

  // ==================== MISSION CRUD ====================

  createMission(gameId: string, data: Partial<Mission>): Mission {
    const missions = this.missions.get(gameId) || [];
    const mission: Mission = {
      id: generateId(),
      gameId,
      order: missions.length + 1,
      title: data.title || `Mission ${missions.length + 1}`,
      description: data.description || '',
      type: data.type || 'quiz',
      xp: data.xp || 100,
      timeLimit: data.timeLimit || 60,
      questions: data.questions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    missions.push(mission);
    this.missions.set(gameId, missions);
    return mission;
  }

  getMissions(gameId: string): Mission[] {
    return this.missions.get(gameId) || [];
  }

  updateMission(id: string, data: Partial<Mission>): Mission | undefined {
    for (const [gameId, missions] of this.missions.entries()) {
      const index = missions.findIndex(m => m.id === id);
      if (index !== -1) {
        const updated = { ...missions[index], ...data, updatedAt: new Date() };
        missions[index] = updated;
        return updated;
      }
    }
    return undefined;
  }

  deleteMission(id: string): boolean {
    for (const [gameId, missions] of this.missions.entries()) {
      const index = missions.findIndex(m => m.id === id);
      if (index !== -1) {
        missions.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // ==================== PLAYER MANAGEMENT ====================

  addPlayer(gameId: string, data: Partial<Player>): Player {
    const players = this.players.get(gameId) || [];
    const player: Player = {
      id: generateId(),
      gameId,
      nickname: data.nickname || 'Player',
      avatar: data.avatar || '🦊',
      xp: 0,
      energy: 3,
      correctAnswers: 0,
      totalAnswers: 0,
      achievements: [],
      joinedAt: new Date(),
    };

    players.push(player);
    this.players.set(gameId, players);

    // Auto-assign to team if team mode
    const game = this.games.get(gameId);
    if (game?.mode === 'team') {
      this.assignPlayerToTeam(gameId, player.id);
    }

    return player;
  }

  getPlayers(gameId: string): Player[] {
    return this.players.get(gameId) || [];
  }

  updatePlayer(id: string, data: Partial<Player>): Player | undefined {
    for (const [gameId, players] of this.players.entries()) {
      const index = players.findIndex(p => p.id === id);
      if (index !== -1) {
        players[index] = { ...players[index], ...data };
        return players[index];
      }
    }
    return undefined;
  }

  removePlayer(id: string): boolean {
    for (const [gameId, players] of this.players.entries()) {
      const index = players.findIndex(p => p.id === id);
      if (index !== -1) {
        players.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // ==================== TEAM MANAGEMENT ====================

  createTeams(gameId: string, count: number): Team[] {
    const teams: Team[] = [];
    for (let i = 0; i < count; i++) {
      teams.push({
        id: generateId(),
        gameId,
        name: TEAM_COLORS[i]?.name || `Team ${i + 1}`,
        color: TEAM_COLORS[i]?.color || 'bg-gray-400',
        totalXp: 0,
      });
    }
    this.teams.set(gameId, teams);
    return teams;
  }

  assignPlayerToTeam(gameId: string, playerId: string): void {
    const teams = this.teams.get(gameId) || [];
    const players = this.players.get(gameId) || [];
    
    if (teams.length === 0) return;

    // Find team with least players
    const teamPlayerCounts = teams.map(team => ({
      team,
      count: players.filter(p => p.teamId === team.id).length,
    }));

    const sortedTeams = teamPlayerCounts.sort((a, b) => a.count - b.count);
    const targetTeam = sortedTeams[0].team;

    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      players[playerIndex].teamId = targetTeam.id;
    }
  }

  getTeams(gameId: string): Team[] {
    return this.teams.get(gameId) || [];
  }

  // ==================== GAME SESSION ====================

  startGame(gameId: string): GameSession | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    // Create teams if team mode
    if (game.mode === 'team') {
      this.createTeams(gameId, game.teamCount);
    }

    const session: GameSession = {
      id: generateId(),
      gameId,
      status: 'active',
      currentMissionIndex: 0,
      bossHp: game.bossHp,
      startedAt: new Date(),
    };

    this.sessions.set(gameId, session);
    this.updateGame(gameId, { status: 'active' });

    return session;
  }

  pauseGame(gameId: string): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.status = 'paused';
    }
  }

  resumeGame(gameId: string): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.status = 'active';
    }
  }

  endGame(gameId: string): void {
    const session = this.sessions.get(gameId);
    if (session) {
      session.status = 'completed';
      session.endedAt = new Date();
    }
    this.updateGame(gameId, { status: 'completed' });
  }

  getSession(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId);
  }

  // ==================== GAME LOGIC ====================

  submitAnswer(gameId: string, playerId: string, answer: number): { correct: boolean; xp: number } {
    const session = this.sessions.get(gameId);
    const players = this.players.get(gameId) || [];
    const missions = this.missions.get(gameId) || [];

    if (!session || session.status !== 'active') {
      return { correct: false, xp: 0 };
    }

    const currentMission = missions[session.currentMissionIndex];
    if (!currentMission || currentMission.questions.length === 0) {
      return { correct: false, xp: 0 };
    }

    const question = currentMission.questions[0];
    const correct = answer === question.correctAnswer;

    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      players[playerIndex].totalAnswers++;
      if (correct) {
        players[playerIndex].correctAnswers++;
        players[playerIndex].xp += currentMission.xp;
      }
    }

    return { correct, xp: correct ? currentMission.xp : 0 };
  }

  attackBoss(gameId: string, damage: number): number {
    const session = this.sessions.get(gameId);
    if (!session) return 0;

    session.bossHp = Math.max(0, session.bossHp - damage);
    return session.bossHp;
  }

  nextMission(gameId: string): Mission | undefined {
    const session = this.sessions.get(gameId);
    const missions = this.missions.get(gameId) || [];

    if (!session) return undefined;

    session.currentMissionIndex++;
    
    if (session.currentMissionIndex >= missions.length) {
      // All missions completed, go to boss
      return undefined;
    }

    return missions[session.currentMissionIndex];
  }

  // ==================== ANALYTICS ====================

  getGameStats(gameId: string) {
    const players = this.players.get(gameId) || [];
    const missions = this.missions.get(gameId) || [];
    const teams = this.teams.get(gameId) || [];

    const totalPlayers = players.length;
    const totalXp = players.reduce((sum, p) => sum + p.xp, 0);
    const avgXp = totalPlayers > 0 ? Math.round(totalXp / totalPlayers) : 0;
    const avgAccuracy = totalPlayers > 0
      ? Math.round(players.reduce((sum, p) => sum + (p.totalAnswers > 0 ? p.correctAnswers / p.totalAnswers : 0), 0) / totalPlayers * 100)
      : 0;

    return {
      totalPlayers,
      totalXp,
      avgXp,
      avgAccuracy,
      missionsCompleted: missions.length,
      teams: teams.map(t => ({
        ...t,
        playerCount: players.filter(p => p.teamId === t.id).length,
      })),
      topPlayers: [...players].sort((a, b) => b.xp - a.xp).slice(0, 5),
    };
  }
}

// Singleton instance
export const gameEngine = new GameEngine();
