/**
 * MÓDULO DE FUNÇÕES GEOMÉTRICAS E UTILITÁRIAS PARA GRIDS (gridUtils.js)
 * Contém funções e constantes fundamentais para navegação ortogonal, checagem de limites,
 * geração de chaves de identificação e verificação de adjacência em tabuleiros bidimensionais.
 */

/**
 * Vetor de deltas direcionais para iteração ortogonal no grid.
 * Representa os 4 movimentos possíveis: Cima (-1, 0), Baixo (+1, 0), Esquerda (0, -1) e Direita (0, +1).
 */
export const DELTAS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

/**
 * Verifica se uma coordenada (r, c) está dentro dos limites de um grid quadrado de tamanho gridSize.
 * @param {number} r - Linha (row).
 * @param {number} c - Coluna (col).
 * @param {number} gridSize - Dimensão do grid (ex: 8 para um tabuleiro 8x8).
 * @returns {boolean} True se a coordenada for válida e estiver dentro do tabuleiro.
 */
export const inBounds = (r, c, gridSize) =>
  r >= 0 && c >= 0 && r < gridSize && c < gridSize;

/**
 * Retorna uma chave de texto padronizada para identificar uma coordenada no formato "r-c".
 * @param {number} r - Linha.
 * @param {number} c - Coluna.
 * @returns {string} Chave única representativa da célula.
 */
export const posKey = (r, c) => `${r}-${c}`;

/**
 * Retorna uma chave única representativa de uma aresta (borda) entre duas posições adjacentes.
 * Garante que a ordem de passagem (a->b ou b->a) produza sempre a mesma chave lexicográfica,
 * permitindo o mapeamento consistente de paredes e conexões bidirecionais.
 * @param {Object} a - Coordenada da primeira célula {r, c}.
 * @param {Object} b - Coordenada da segunda célula {r, c}.
 * @returns {string} Chave formatada "r1-c1|r2-c2".
 */
export const edgeKey = (a, b) => {
  const ka = posKey(a.r, a.c);
  const kb = posKey(b.r, b.c);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

/**
 * Verifica se duas posições no grid são vizinhas ortogonais diretas (adjacentes).
 * @param {Object} a - Coordenada {r, c}.
 * @param {Object} b - Coordenada {r, c}.
 * @returns {boolean} True se a distância de Manhattan entre as células for exatamente 1.
 */
export const areAdjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

/**
 * Cria uma cópia rasa de um objeto de posição, evitando mutação acidental de referências.
 * @param {Object} pos - Coordenada original {r, c}.
 * @returns {Object} Novo objeto contendo as mesmas coordenadas {r, c}.
 */
export const copyPos = (pos) => ({ r: pos.r, c: pos.c });

/**
 * Identifica a direção em formato de texto descritivo (em português) de um movimento entre duas células.
 * @param {Object} from - Célula de origem {r, c}.
 * @param {Object} to - Célula de destino {r, c}.
 * @returns {string} Retorna "cima", "baixo", "esquerda" ou "direita".
 */
export const getDirectionName = (from, to) => {
  if (to.r < from.r) return "cima";
  if (to.r > from.r) return "baixo";
  if (to.c < from.c) return "esquerda";
  return "direita";
};
