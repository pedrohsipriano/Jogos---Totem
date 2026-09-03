/**
 * seeds.js — Dados iniciais para o banco IndexedDB do Totem
 * 
 * Executado apenas na primeira instalação (quando o banco está vazio).
 * Inclui os jogos padrão, palavras de exemplo e perguntas de exemplo.
 */

import { dbPutMany, dbIsSeeded } from './localDB.js';

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
const SEED_WORDS_HANGMAN = [
  { gameId: 1, word: 'CONVECAO',   hint: null, imageUrl: null, meta: null },
  { gameId: 1, word: 'COMERCIO',   hint: null, imageUrl: null, meta: null },
  { gameId: 1, word: 'EMPRESA',    hint: null, imageUrl: null, meta: null },
  { gameId: 1, word: 'INOVACAO',   hint: null, imageUrl: null, meta: null },
  { gameId: 1, word: 'NEGOCIO',    hint: null, imageUrl: null, meta: null },
];

/** Palavras de exemplo para Caça-Palavras (gameId: 7) */
const SEED_WORDS_WORDSEARCH = [
  { gameId: 7, word: 'CONVECAO',  hint: null, imageUrl: null, meta: null },
  { gameId: 7, word: 'LOJA',      hint: null, imageUrl: null, meta: null },
  { gameId: 7, word: 'VENDA',     hint: null, imageUrl: null, meta: null },
  { gameId: 7, word: 'CLIENTE',   hint: null, imageUrl: null, meta: null },
  { gameId: 7, word: 'PRODUTO',   hint: null, imageUrl: null, meta: null },
];

/** Cartas padrão universais para Jogo da Memória (gameId: 5) */
const SEED_WORDS_MEMORY = [
  { gameId: 5, word: 'GAMEPAD',   hint: null, imageUrl: '/images/memory/card-gamepad.svg', meta: null },
  { gameId: 5, word: 'TROFEU',    hint: null, imageUrl: '/images/memory/card-trophy.svg', meta: null },
  { gameId: 5, word: 'DIAMANTE',  hint: null, imageUrl: '/images/memory/card-diamond.svg', meta: null },
  { gameId: 5, word: 'FOGUETE',   hint: null, imageUrl: '/images/memory/card-rocket.svg', meta: null },
  { gameId: 5, word: 'ESTRELA',   hint: null, imageUrl: '/images/memory/card-star.svg', meta: null },
  { gameId: 5, word: 'ALVO',      hint: null, imageUrl: '/images/memory/card-target.svg', meta: null },
];

/** Palavras de exemplo para Soletra (gameId: 10) */
const SEED_SOLETRA = [
  { gameId: 10, word: 'CONVECAO',  hint: 'Associação comercial' },
  { gameId: 10, word: 'COMERCIO',  hint: 'Troca de mercadorias' },
  { gameId: 10, word: 'EMPRESA',   hint: 'Organização econômica' },
];

/** Palavras de exemplo para Labirinto (gameId: 2) */
const SEED_LABIRINTO = [
  { gameId: 2, word: 'CONVECAO',  hint: 'Associação do comércio local' },
  { gameId: 2, word: 'COMERCIO',  hint: 'Atividade de compra e venda' },
  { gameId: 2, word: 'CLIENTE',   hint: 'Quem compra produtos' },
];

/** Perguntas de exemplo para Quiz (gameId: 3) */
const SEED_QUIZ = [
  {
    gameId: 3,
    question: 'Qual é o objetivo principal de uma convenção comercial?',
    answer: 'Promover negócios e networking',
    options: JSON.stringify([
      'Promover negócios e networking',
      'Realizar shows musicais',
      'Vender ingressos',
      'Organizar campeonatos',
    ]),
  },
  {
    gameId: 3,
    question: 'O que significa CDL?',
    answer: 'Câmara de Dirigentes Lojistas',
    options: JSON.stringify([
      'Câmara de Dirigentes Lojistas',
      'Centro de Desenvolvimento Local',
      'Clube dos Líderes',
      'Conselho de Lojistas',
    ]),
  },
  {
    gameId: 3,
    question: 'Qual atividade fortalece o comércio local?',
    answer: 'Comprar de comerciantes locais',
    options: JSON.stringify([
      'Comprar de comerciantes locais',
      'Importar tudo do exterior',
      'Evitar promoções',
      'Fechar lojas',
    ]),
  },
];

/** Configurações padrão dos jogos (Padrão 30s para todos) */
const SEED_GAME_SETTINGS = [
  { gameId: 1,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 1,  key: 'pointsToWin',             value: 50  },
  { gameId: 2,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 2,  key: 'pointsToWin',             value: 100 },
  { gameId: 3,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 3,  key: 'pointsToWin',             value: 50  },
  { gameId: 3,  key: 'questionLimit',           value: 5   },
  { gameId: 4,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 4,  key: 'pointsToWin',             value: 50  },
  { gameId: 5,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 5,  key: 'pairCount',               value: 6   },
  { gameId: 6,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 6,  key: 'gridSize',                value: 12  },
  { gameId: 7,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 7,  key: 'gridSize',                value: 10  },
  { gameId: 7,  key: 'wordLimit',               value: 5   },
  { gameId: 8,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 8,  key: 'questionLimit',           value: 5   },
  { gameId: 9,  key: 'timeLimitSeconds',        value: 30  },
  { gameId: 9,  key: 'gridSize',                value: 10  },
  { gameId: 10, key: 'timeLimitSeconds',        value: 30  },
  { gameId: 10, key: 'soletraWordLimit',        value: 3   },
];

/**
 * Executa o seed completo do banco de dados.
 * Só roda se o banco estiver vazio (primeira instalação).
 */
export async function runSeed() {
  try {
    const { dbGetAll, dbPut, dbDelete } = await import('./localDB.js');

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

    // Migração de ícones do Jogo da Memória: substitui ícones do evento antigo pelos novos padrões
    const MEMORY_ICONS_MIGRATION_KEY = 'totem_memory_new_icons_v1';
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
