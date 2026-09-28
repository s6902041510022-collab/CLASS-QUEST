import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Default data structure
const defaultData = {
  games: [],
  missions: [],
  players: [],
  teams: [],
  sessions: [],
  settings: {
    teacherPin: '1234',
  },
};

// Initialize database
export async function getDb() {
  const db = await JSONFilePreset(DB_PATH, defaultData);
  return db;
}

// ==================== GAME OPERATIONS ====================

export async function createGame(gameData: any) {
  const db = await getDb();
  const game = {
    id: uuidv4(),
    ...gameData,
    status: 'draft',
    roomCode: generateRoomCode(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.games.push(game);
  await db.write();
  return game;
}

export async function getGame(id: string) {
  const db = await getDb();
  return db.data.games.find((g: any) => g.id === id);
}

export async function getGameByRoomCode(roomCode: string) {
  const db = await getDb();
  return db.data.games.find((g: any) => g.roomCode === roomCode);
}

export async function getAllGames() {
  const db = await getDb();
  return db.data.games;
}

export async function updateGame(id: string, updates: any) {
  const db = await getDb();
  const index = db.data.games.findIndex((g: any) => g.id === id);
  if (index === -1) return null;
  db.data.games[index] = { ...db.data.games[index], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.games[index];
}

export async function deleteGame(id: string) {
  const db = await getDb();
  const index = db.data.games.findIndex((g: any) => g.id === id);
  if (index === -1) return false;
  db.data.games.splice(index, 1);
  // Also delete related missions and players
  db.data.missions = db.data.missions.filter((m: any) => m.gameId !== id);
  db.data.players = db.data.players.filter((p: any) => p.gameId !== id);
  await db.write();
  return true;
}

// ==================== MISSION OPERATIONS ====================

export async function createMission(missionData: any) {
  const db = await getDb();
  const gameMissions = db.data.missions.filter((m: any) => m.gameId === missionData.gameId);
  const mission = {
    id: uuidv4(),
    ...missionData,
    order: gameMissions.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.data.missions.push(mission);
  await db.write();
  return mission;
}

export async function getMissions(gameId: string) {
  const db = await getDb();
  return db.data.missions
    .filter((m: any) => m.gameId === gameId)
    .sort((a: any, b: any) => a.order - b.order);
}

export async function getMission(id: string) {
  const db = await getDb();
  return db.data.missions.find((m: any) => m.id === id);
}

export async function updateMission(id: string, updates: any) {
  const db = await getDb();
  const index = db.data.missions.findIndex((m: any) => m.id === id);
  if (index === -1) return null;
  db.data.missions[index] = { ...db.data.missions[index], ...updates, updatedAt: new Date().toISOString() };
  await db.write();
  return db.data.missions[index];
}

export async function deleteMission(id: string) {
  const db = await getDb();
  const index = db.data.missions.findIndex((m: any) => m.id === id);
  if (index === -1) return false;
  db.data.missions.splice(index, 1);
  await db.write();
  return true;
}

// ==================== PLAYER OPERATIONS ====================

export async function createPlayer(playerData: any) {
  const db = await getDb();
  const player = {
    id: uuidv4(),
    ...playerData,
    xp: 0,
    energy: 3,
    correctAnswers: 0,
    totalAnswers: 0,
    achievements: [],
    joinedAt: new Date().toISOString(),
  };
  db.data.players.push(player);
  await db.write();
  return player;
}

export async function getPlayers(gameId: string) {
  const db = await getDb();
  return db.data.players.filter((p: any) => p.gameId === gameId);
}

export async function getPlayer(id: string) {
  const db = await getDb();
  return db.data.players.find((p: any) => p.id === id);
}

export async function updatePlayer(id: string, updates: any) {
  const db = await getDb();
  const index = db.data.players.findIndex((p: any) => p.id === id);
  if (index === -1) return null;
  db.data.players[index] = { ...db.data.players[index], ...updates };
  await db.write();
  return db.data.players[index];
}

export async function deletePlayer(id: string) {
  const db = await getDb();
  const index = db.data.players.findIndex((p: any) => p.id === id);
  if (index === -1) return false;
  db.data.players.splice(index, 1);
  await db.write();
  return true;
}

// ==================== TEAM OPERATIONS ====================

export async function createTeams(gameId: string, count: number) {
  const db = await getDb();
  const teamNames = ['Team CPU', 'Team Cache', 'Team RAM', 'Team Storage'];
  const teamColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];
  
  const teams = [];
  for (let i = 0; i < count; i++) {
    const team = {
      id: uuidv4(),
      gameId,
      name: teamNames[i] || `Team ${i + 1}`,
      color: teamColors[i] || 'bg-gray-400',
      totalXp: 0,
    };
    teams.push(team);
    db.data.teams.push(team);
  }
  await db.write();
  return teams;
}

export async function getTeams(gameId: string) {
  const db = await getDb();
  return db.data.teams.filter((t: any) => t.gameId === gameId);
}

// ==================== SESSION OPERATIONS ====================

export async function createSession(gameId: string) {
  const db = await getDb();
  const game = await getGame(gameId);
  const session = {
    id: uuidv4(),
    gameId,
    status: 'lobby',
    currentMissionIndex: 0,
    bossHp: game?.bossHp || 1000,
    startedAt: null,
    endedAt: null,
  };
  db.data.sessions.push(session);
  await db.write();
  return session;
}

export async function getSession(gameId: string) {
  const db = await getDb();
  return db.data.sessions.find((s: any) => s.gameId === gameId);
}

export async function updateSession(gameId: string, updates: any) {
  const db = await getDb();
  const index = db.data.sessions.findIndex((s: any) => s.gameId === gameId);
  if (index === -1) return null;
  db.data.sessions[index] = { ...db.data.sessions[index], ...updates };
  await db.write();
  return db.data.sessions[index];
}

// ==================== AUTH ====================

export async function verifyPin(pin: string) {
  const db = await getDb();
  return pin === db.data.settings.teacherPin;
}

// ==================== HELPERS ====================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
