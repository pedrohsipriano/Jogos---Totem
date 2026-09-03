/**
 * seeds.js — Dados iniciais para o banco IndexedDB do Totem
 * 
 * Executado apenas na primeira instalação (quando o banco está vazio).
 * Inclui os jogos padrão, palavras de exemplo e perguntas de exemplo.
 */

import { dbPutMany, dbIsSeeded, dbGetAll, dbPut, dbDelete } from './localDB.js';
import memoryData from '../../data/memory.json';
import hangmanData from '../../data/hangman.json';
import wordsearchData from '../../data/wordsearch.json';
import soletraData from '../../data/soletra.json';
import labirintoData from '../../data/labirinto.json';
import quizData from '../../data/quiz.json';

/** Lista de jogos disponíveis no Totem */
const SEED_GAMES = [
  { id: 1,  code: 'hangman',    name: 'Forca',           enabled: 1 },
  { id: 2,  code: 'labirinto',  name: 'Labirinto',       enabled: 1 },
  { id: 3,  code: 'quiz',       name: 'Quiz',            enabled: 1 },
  { id: 4,  code: 'catch',      name: 'Pega-Itens',      enabled: 1 },
  { id: 5,  code: 'memory',     name: 'Jogo da Memória', enabled: 1 },
  { id: 6,  code: 'whac',       name: 'Acerte o Alvo',   enabled: 1 },
  { id: 7,  code: 'wordsearch', name: 'Caça-Palavras',   enabled: 1 },
  { id: 8,  code: 'soletra',    name: 'Soletra',         enabled: 1 },
];

/** Palavras de exemplo para Forca (gameId: 1) */
const SEED_WORDS_HANGMAN = hangmanData.words.map((w, idx) => ({
  id: idx + 1,
  gameId: 1,
  word: w.word,
  hint: null,
  imageUrl: null,
  meta: null,
}));

/** Palavras de exemplo para Caça-Palavras (gameId: 7) */
const SEED_WORDS_WORDSEARCH = wordsearchData.words.map((w, idx) => ({
  id: 1000 + idx + 1,
  gameId: 7,
  word: w.word,
  hint: null,
  imageUrl: null,
  meta: null,
}));

/** Cartas padrão universais para Jogo da Memória (gameId: 5) */
const SEED_WORDS_MEMORY = memoryData.words;

/** Palavras de exemplo para Soletra (gameId: 10) */
const SEED_SOLETRA = soletraData.rounds.map((r, idx) => ({
  id: idx + 1,
  gameId: 10,
  word: r.word,
  hint: r.hint,
}));

/** Palavras de exemplo para Labirinto (gameId: 2) */
const SEED_LABIRINTO = labirintoData.words.map((w, idx) => ({
  id: idx + 1,
  gameId: 2,
  word: w.word,
  hint: w.hint,
}));

/** Perguntas de exemplo para Quiz (gameId: 3) */
const SEED_QUIZ = quizData.quiz.map((q, idx) => ({
  id: idx + 1,
  gameId: 3,
  question: q.question,
  answer: q.answer,
  options: JSON.stringify(q.options),
}));

/** Configurações padrão dos jogos (Modo fácil e 100 pontos para ganhar em todos) */
const SEED_GAME_SETTINGS = [
  // 1. Forca (hangman)
  { gameId: 1,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 1,  key: 'pointsToWin',             value: 100 },
  { gameId: 1,  key: 'hangmanWordLength',       value: 5   },
  { gameId: 1,  key: 'hangmanWordLengthIsMin',  value: 1   },

  // 2. Labirinto (labirinto)
  { gameId: 2,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 2,  key: 'pointsToWin',             value: 100 },
  { gameId: 2,  key: 'gridSize',                value: 8   },
  { gameId: 2,  key: 'labirintoWordLength',     value: 5   },
  { gameId: 2,  key: 'labirintoWordLengthIsMin', value: 1  },

  // 3. Quiz (quiz)
  { gameId: 3,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 3,  key: 'pointsToWin',             value: 100 },
  { gameId: 3,  key: 'questionLimit',           value: 3   },

  // 4. Pega-Itens (catch)
  { gameId: 4,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 4,  key: 'pointsToWin',             value: 100 },
  { gameId: 4,  key: 'initialFallTimeSeconds',  value: 10  },

  // 5. Jogo da Memória (memory)
  { gameId: 5,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 5,  key: 'pointsToWin',             value: 100 },
  { gameId: 5,  key: 'pairCount',               value: 6   },

  // 6. Acerte o Alvo (whac)
  { gameId: 6,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 6,  key: 'pointsToWin',             value: 100 },
  { gameId: 6,  key: 'gridSize',                value: 12  },

  // 7. Caça-Palavras (wordsearch)
  { gameId: 7,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 7,  key: 'pointsToWin',             value: 100 },
  { gameId: 7,  key: 'gridSize',                value: 10  },
  { gameId: 7,  key: 'wordLimit',               value: 3   },

  // 8. Soletra (soletra)
  { gameId: 8,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 8,  key: 'pointsToWin',             value: 100 },
  { gameId: 8,  key: 'soletraWordLimit',        value: 3   },
];

/**
 * Executa o seed completo do banco de dados.
 * Só roda se o banco estiver vazio (primeira instalação).
 */
export async function runSeed() {
  try {
    const { dbGetAll, dbPut, dbDelete, dbPutMany } = await import('./localDB.js');

    // Limpeza de jogos legados (CDL Mulher) caso já estejam salvos no IndexedDB
    try {
      const existingGames = await dbGetAll('games');
      for (const g of existingGames) {
        if (g.code === 'quiz_mulher' || g.code === 'wordsearch_mulher') {
          await dbDelete('games', g.id);
        }
      }
    } catch {}

    // Migração de tempo: garante que todos os jogos no IndexedDB fiquem no padrão de 30 segundos
    const TIME_MIGRATION_KEY = 'totem_games_time_30s_v2';
    if (!localStorage.getItem(TIME_MIGRATION_KEY)) {
      try {
        const settings = await dbGetAll('gameSettings');
        for (const s of settings) {
          if (s.key === 'timeLimitSeconds' || s.key === 'timeLimit') {
            await dbPut('gameSettings', { ...s, value: 30 });
          }
        }
        localStorage.setItem(TIME_MIGRATION_KEY, 'true');
      } catch (err) {
        console.warn('Erro ao padronizar tempos dos jogos para 30s:', err);
      }
    }

    // Migração de Modo Fácil: 100 pts para ganhar, 6 pares na memória, 3 palavras no caça-palavras e soletra, 5 min na forca e labirinto
    const EASY_DEFAULTS_MIGRATION_KEY = 'totem_easy_defaults_v2';
    if (!localStorage.getItem(EASY_DEFAULTS_MIGRATION_KEY)) {
      try {
        const games = await dbGetAll('games');
        const gameByCode = new Map(games.map(g => [g.code, g.id]));
        const settings = await dbGetAll('gameSettings');

        const upsertSetting = async (gameId, key, value) => {
          if (!gameId) return;
          const existing = settings.find(s => Number(s.gameId) === Number(gameId) && s.key === key);
          if (existing) {
            await dbPut('gameSettings', { ...existing, value });
          } else {
            await dbPut('gameSettings', { gameId: Number(gameId), key, value });
          }
        };

        for (const g of games) {
          await upsertSetting(g.id, 'pointsToWin', 100);
        }

        await upsertSetting(gameByCode.get('memory'), 'pairCount', 6);
        await upsertSetting(gameByCode.get('wordsearch'), 'wordLimit', 3);
        await upsertSetting(gameByCode.get('soletra'), 'soletraWordLimit', 3);
        await upsertSetting(gameByCode.get('hangman'), 'hangmanWordLength', 5);
        await upsertSetting(gameByCode.get('hangman'), 'hangmanWordLengthIsMin', 1);
        await upsertSetting(gameByCode.get('labirinto'), 'labirintoWordLength', 5);
        await upsertSetting(gameByCode.get('labirinto'), 'labirintoWordLengthIsMin', 1);

        localStorage.setItem(EASY_DEFAULTS_MIGRATION_KEY, 'true');
      } catch (err) {
        console.warn('Erro ao aplicar configurações de modo fácil no IndexedDB:', err);
      }
    }

    // Migração de ícones do Jogo da Memória: substitui ícones do evento antigo pelos novos padrões
    const MEMORY_ICONS_MIGRATION_KEY = 'totem_memory_new_icons_v3';
    if (!localStorage.getItem(MEMORY_ICONS_MIGRATION_KEY)) {
      try {
        const words = await dbGetAll('words');
        for (const w of words) {
          if (Number(w.gameId) === 5) {
            await dbDelete('words', w.id);
          }
        }
        await dbPutMany('words', SEED_WORDS_MEMORY);

        // Se o tema estiver com o verso antigo Icons-119.png, reseta para usar o novo card-back-default.svg
        try {
          const rawTheme = localStorage.getItem('totem_theme');
          if (rawTheme) {
            const parsedTheme = JSON.parse(rawTheme);
            if (parsedTheme.memoryCardBack && parsedTheme.memoryCardBack.includes('Icons-119.png')) {
              parsedTheme.memoryCardBack = null;
              localStorage.setItem('totem_theme', JSON.stringify(parsedTheme));
            }
          }
        } catch {}

        localStorage.setItem(MEMORY_ICONS_MIGRATION_KEY, 'true');
      } catch (err) {
        console.warn('Erro ao migrar ícones padrão do jogo da memória:', err);
      }
    }

    // Migração de Conteúdo Neutro: atualiza Forca, Caça-Palavras, Soletra, Labirinto e Quiz com variedade de palavras e perguntas
    const NEUTRAL_CONTENT_MIGRATION_KEY = 'totem_neutral_content_v3';
    if (!localStorage.getItem(NEUTRAL_CONTENT_MIGRATION_KEY)) {
      try {
        const words = await dbGetAll('words');
        for (const w of words) {
          if (Number(w.gameId) === 1 || Number(w.gameId) === 7) {
            await dbDelete('words', w.id);
          }
        }
        await dbPutMany('words', [
          ...SEED_WORDS_HANGMAN,
          ...SEED_WORDS_WORDSEARCH,
        ]);

        const soletraRounds = await dbGetAll('soletraRounds');
        for (const s of soletraRounds) {
          await dbDelete('soletraRounds', s.id);
        }
        await dbPutMany('soletraRounds', SEED_SOLETRA);

        const labirintoRounds = await dbGetAll('labirintoRounds');
        for (const l of labirintoRounds) {
          await dbDelete('labirintoRounds', l.id);
        }
        await dbPutMany('labirintoRounds', SEED_LABIRINTO);

        const quizQuestions = await dbGetAll('quizQuestions');
        for (const q of quizQuestions) {
          await dbDelete('quizQuestions', q.id);
        }
        await dbPutMany('quizQuestions', SEED_QUIZ);

        localStorage.setItem(NEUTRAL_CONTENT_MIGRATION_KEY, 'true');
      } catch (err) {
        console.warn('Erro ao migrar conteúdos neutros para o IndexedDB:', err);
      }
    }

    await dbPutMany('games', SEED_GAMES);

    const allWords = [
      ...SEED_WORDS_HANGMAN,
      ...SEED_WORDS_WORDSEARCH,
      ...SEED_WORDS_MEMORY,
    ];
    await dbPutMany('words', allWords);
    await dbPutMany('soletraRounds', SEED_SOLETRA);
    await dbPutMany('labirintoRounds', SEED_LABIRINTO);
    await dbPutMany('quizQuestions', SEED_QUIZ);
    await dbPutMany('gameSettings', SEED_GAME_SETTINGS);

    console.info('[Totem DB] Banco inicializado com dados de exemplo.');
  } catch (error) {
    console.error('[Totem DB] Erro ao executar seed:', error);
  }
}
