/**
 * appDatabase.js — Camada de acesso a dados do Totem (100% Offline, IndexedDB)
 *
 * Todos os dados são persistidos localmente via IndexedDB (src/lib/db/localDB.js).
 * Índices cobrem todas as buscas frequentes: gameId, playerId, phone, code, key.
 */

import {
  dbGetAll,
  dbGet,
  dbGetByIndex,
  dbPut,
  dbPutMany,
  dbDelete,
  dbPopulateRelations,
} from './db/localDB.js';
import { buildGameConfig } from '../utils/gameConfig.js';

// ─── Autenticação Admin ───────────────────────────────────────────────────────

const ADMIN_PASS_KEY = 'totem_admin_pass';

export const setAdminPassword   = (pass) => localStorage.setItem(ADMIN_PASS_KEY, pass);
export const clearAdminPassword = ()     => localStorage.removeItem(ADMIN_PASS_KEY);
export const getAdminPassword   = ()     => localStorage.getItem(ADMIN_PASS_KEY) ?? '';

const REAL_PASS_KEY = 'totem_real_admin_pass';

export async function hasAdminPassword() {
  return !!localStorage.getItem(REAL_PASS_KEY);
}

export async function registerAdminPassword(pass) {
  localStorage.setItem(REAL_PASS_KEY, pass);
}

export async function verifyAdminPassword(pass) {
  const realPass = localStorage.getItem(REAL_PASS_KEY);
  if (!realPass) return false;
  return pass === realPass;
}

// ─── Jogadores ────────────────────────────────────────────────────────────────

export async function getPlayer(phone) {
  const all = await dbGetAll('players');
  return all.find((p) => p.phone === phone) ?? null;
}

export async function registerPlayer(name, phone) {
  const existing = await getPlayer(phone);
  if (existing) return existing;
  return dbPut('players', {
    name,
    phone,
    totalPoints: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function checkPlayerPhone(phone, gameCode = null) {
  const player = await getPlayer(phone);
  if (!player) return { exists: false, attempts: 0 };

  // Conta tentativas neste jogo, se informado
  if (gameCode) {
    const games = await dbGetAll('games');
    const game  = games.find((g) => g.code === gameCode);
    if (game) {
      const scores = await dbGetByIndex('playerGameScores', 'playerId', player.id);
      const gameScore = scores.find((s) => s.gameId === game.id);
      return { exists: true, attempts: gameScore?.attempts ?? 0 };
    }
  }
  return { exists: true, attempts: 0 };
}

// ─── Pontuações ───────────────────────────────────────────────────────────────

export async function saveGameScore(scoreData) {
  const { name, phone, gameCode, points, timeBonus = 0, meta = {} } = scoreData ?? {};

  // Garantir que jogador existe
  const player = await registerPlayer(name ?? 'Anônimo', phone ?? '');
  const games  = await dbGetAll('games');
  const game   = games.find((g) => g.code === gameCode);
  if (!game) return [];

  const now = new Date().toISOString();

  // Atualizar ou criar registro de pontuação por jogo
  const scores = await dbGetByIndex('playerGameScores', 'playerId', player.id);
  const existing = scores.find((s) => s.gameId === game.id);

  const newScore = {
    ...(existing ?? {}),
    playerId:     player.id,
    gameId:       game.id,
    points:       Math.max(existing?.points ?? 0, points ?? 0),
    attempts:     (existing?.attempts ?? 0) + 1,
    lastPlayedAt: now,
  };
  await dbPut('playerGameScores', newScore);

  // Registrar evento de score
  await dbPut('scoreEvents', {
    playerId:  player.id,
    gameId:    game.id,
    points:    points ?? 0,
    timeBonus: timeBonus ?? 0,
    meta:      JSON.stringify(meta),
    createdAt: now,
  });

  // Atualizar totalPoints do jogador
  const allScores = await dbGetByIndex('playerGameScores', 'playerId', player.id);
  const total = allScores.reduce((acc, s) => acc + (s.points ?? 0), 0);
  await dbPut('players', { ...player, totalPoints: total });

  return getRanking();
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export async function getRanking(gameCode = null) {
  if (gameCode) {
    const games  = await dbGetAll('games');
    const game   = games.find((g) => g.code === gameCode);
    if (!game) return [];

    const scores  = await dbGetByIndex('playerGameScores', 'gameId', game.id);
    const players = await dbGetAll('players');
    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

    return scores
      .map((s) => ({ ...s, player: playerMap[s.playerId] ?? null }))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, 50);
  }

  // Ranking geral por totalPoints
  const players = await dbGetAll('players');
  return players
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
    .slice(0, 50);
}

// ─── Conteúdo dos Jogos ───────────────────────────────────────────────────────

export async function getGameContent(gameCode) {
  const games = await dbGetAll('games');
  const game  = games.find((g) => g.code === gameCode);
  if (!game) return {};

  const settings   = await dbGetByIndex('gameSettings', 'gameId', game.id);
  const config     = buildGameConfig(game, settings);

  const storeMap = {
    hangman:           'words',
    wordsearch:        'words',
    wordsearch_mulher: 'words',
    soletra:           'soletraRounds',
    labirinto:         'labirintoRounds',
    quiz:              'quizQuestions',
    quiz_mulher:       'quizQuestions',
  };

  const store = storeMap[gameCode];
  const items = store
    ? await dbGetByIndex(store, 'gameId', game.id)
    : [];

  return { game, config, items };
}

export async function getGameRulesVersion(gameCode) {
  // A "versão" é derivada do timestamp mais recente das configurações do jogo
  const games = await dbGetAll('games');
  const game  = games.find((g) => g.code === gameCode);
  if (!game) return { version: 1 };

  const settings = await dbGetByIndex('gameSettings', 'gameId', game.id);
  // Usa a contagem de settings como versão simples
  return { version: settings.length || 1 };
}

// ─── Admin — Registros Gerais ─────────────────────────────────────────────────

export async function getAdminRecords() {
  const [
    players, games, words, quizQuestions,
    soletraRounds, labirintoRounds,
    playerGameScores, scoreEvents, gameSettings,
  ] = await Promise.all([
    dbGetAll('players'),
    dbGetAll('games'),
    dbGetAll('words'),
    dbGetAll('quizQuestions'),
    dbGetAll('soletraRounds'),
    dbGetAll('labirintoRounds'),
    dbGetAll('playerGameScores'),
    dbGetAll('scoreEvents'),
    dbGetAll('gameSettings'),
  ]);

  // Popular relações (Game e Player) de forma indexada
  const [
    wordsWithRel, quizWithRel, soletraWithRel,
    labirintoWithRel, scoresWithRel, eventsWithRel, settingsWithRel,
  ] = await Promise.all([
    dbPopulateRelations(words),
    dbPopulateRelations(quizQuestions),
    dbPopulateRelations(soletraRounds),
    dbPopulateRelations(labirintoRounds),
    dbPopulateRelations(playerGameScores),
    dbPopulateRelations(scoreEvents),
    dbPopulateRelations(gameSettings),
  ]);

  return {
    players,
    games,
    words:            wordsWithRel,
    quizQuestions:    quizWithRel,
    soletraRounds:    soletraWithRel,
    labirintoRounds:  labirintoWithRel,
    playerGameScores: scoresWithRel,
    scoreEvents:      eventsWithRel,
    gameSettings:     settingsWithRel,
  };
}

/** Retorna jogos + gameSettings para o menu e buildGameConfig. */
export async function getAdminMenuRecords() {
  const [games, gameSettings] = await Promise.all([
    dbGetAll('games'),
    dbGetAll('gameSettings'),
  ]);
  return { games, gameSettings };
}

// ─── Admin — CRUD por recurso ─────────────────────────────────────────────────

const RESOURCE_STORE = {
  players:          'players',
  games:            'games',
  words:            'words',
  quizQuestions:    'quizQuestions',
  soletraRounds:    'soletraRounds',
  labirintoRounds:  'labirintoRounds',
  playerGameScores: 'playerGameScores',
  scoreEvents:      'scoreEvents',
  gameSettings:     'gameSettings',
};

export async function createAdminRecord(resource, payload) {
  const store = RESOURCE_STORE[resource];
  if (!store) throw new Error(`Recurso desconhecido: ${resource}`);

  // Tratamento especial: palavras em massa
  if (resource === 'words' && payload.bulkWords) {
    const wordList = payload.bulkWords
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    const records = wordList.map((word) => ({
      gameId:   Number(payload.gameId),
      word,
      hint:     payload.hint ?? null,
      imageUrl: payload.imageUrl ?? null,
      meta:     null,
    }));
    const inserted = await dbPutMany(store, records);
    return inserted;
  }

  // Perguntas em massa
  if (resource === 'quizQuestions' && payload.bulkQuestions) {
    const blocks = payload.bulkQuestions.split('\n\n').filter(Boolean);
    const records = blocks.map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      return {
        gameId:   Number(payload.gameId),
        question: lines[0] ?? '',
        answer:   lines[1] ?? '',
        options:  JSON.stringify(lines.slice(1)),
      };
    });
    return dbPutMany(store, records);
  }

  // Rodadas soletra/labirinto em massa
  if ((resource === 'soletraRounds' || resource === 'labirintoRounds') && payload.bulkRounds) {
    const blocks = payload.bulkRounds.split('\n').filter(Boolean);
    const records = blocks.map((line) => {
      const [word, hint] = line.split('.').map((s) => s.trim());
      return { gameId: Number(payload.gameId), word: word ?? '', hint: hint ?? null };
    });
    return dbPutMany(store, records);
  }

  const clean = { ...payload };
  delete clean.bulkWords;
  delete clean.bulkQuestions;
  delete clean.bulkRounds;
  if (clean.gameId)   clean.gameId   = Number(clean.gameId);
  if (clean.playerId) clean.playerId = Number(clean.playerId);

  return dbPut(store, clean);
}

export async function updateAdminRecord(resource, id, payload) {
  const store = RESOURCE_STORE[resource];
  if (!store) throw new Error(`Recurso desconhecido: ${resource}`);

  const existing = await dbGet(store, id);
  if (!existing) throw new Error(`Registro #${id} não encontrado em ${resource}`);

  const clean = { ...payload };
  delete clean.bulkWords;
  delete clean.bulkQuestions;
  delete clean.bulkRounds;
  if (clean.gameId)   clean.gameId   = Number(clean.gameId);
  if (clean.playerId) clean.playerId = Number(clean.playerId);

  return dbPut(store, { ...existing, ...clean, id: Number(id) });
}

export async function deleteAdminRecord(resource, id) {
  const store = RESOURCE_STORE[resource];
  if (!store) throw new Error(`Recurso desconhecido: ${resource}`);
  return dbDelete(store, id);
}

// ─── Upload de Imagens (base64 local) ────────────────────────────────────────

export async function uploadImage(file) {
  if (!file) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e.target.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImages(files) {
  if (!files || files.length === 0) return [];
  return Promise.all(Array.from(files).map(uploadImage));
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [players, games, scoreEvents, playerGameScores] = await Promise.all([
    dbGetAll('players'),
    dbGetAll('games'),
    dbGetAll('scoreEvents'),
    dbGetAll('playerGameScores'),
  ]);

  const totalPlayers    = players.length;
  const totalGames      = games.length;
  const totalPlaySessions = scoreEvents.length;

  // Estatísticas por jogo
  const gameStats = games.map((game) => {
    const gameSessions = scoreEvents.filter((e) => e.gameId === game.id);
    const gameScores   = playerGameScores.filter((s) => s.gameId === game.id);
    const totalPoints  = gameSessions.reduce((acc, e) => acc + (e.points ?? 0), 0);
    const avgPoints    = gameSessions.length > 0 ? Math.round(totalPoints / gameSessions.length) : 0;

    return {
      gameId:     game.id,
      gameName:   game.name,
      gameCode:   game.code,
      sessions:   gameSessions.length,
      uniquePlayers: gameScores.length,
      avgPoints,
      totalPoints,
    };
  });

  return {
    totalPlayers,
    totalGames,
    totalPlaySessions,
    gameStats,
  };
}

export async function resetDashboardStats() {
  const { dbClear } = await import('./db/localDB.js');
  await Promise.all([
    dbClear('scoreEvents'),
    dbClear('playerGameScores'),
  ]);

  // Zera totalPoints dos jogadores
  const players = await dbGetAll('players');
  await Promise.all(players.map((p) => dbPut('players', { ...p, totalPoints: 0 })));

  return { ok: true };
}

// ─── Compat — métodos legados ─────────────────────────────────────────────────

export async function loadAppDatabase()  { return { database: {}, isRemote: false }; }
export async function saveAppDatabase()  { return {}; }
export async function deleteAppDatabase(){ return {}; }
export async function updateGiftsConfig(){ return { ok: true }; }
export const getSeedDatabase = ()        => ({});