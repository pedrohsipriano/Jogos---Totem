import { useEffect, useMemo, useRef, useState } from "react";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";
import { shuffle } from "../../../utils/array";
import { wholeSeconds } from "../../../utils/time";

// Tamanho padrão do tabuleiro caso não seja especificado na configuração
const DEFAULT_GRID_SIZE = 8;

// Palavras de fallback garantidas caso o banco esteja vazio ou haja problema de conexão
const DEFAULT_FALLBACK_WORDS = [
    { word: "SAIDA", hint: "Fim do caminho" },
    { word: "ROTA", hint: "Direção a seguir" },
    { word: "MAPA", hint: "Guia de navegação" },
    { word: "DESTINO", hint: "Onde queremos chegar" },
    { word: "CAMINHO", hint: "Trajeto a percorrer" },
    { word: "PORTAL", hint: "Passagem secreta" },
    { word: "AVANCO", hint: "Seguir em frente" },
];

// Distâncias mínimas e máximas (em passos de Manhattan) permitidas entre as letras da palavra
const MIN_GAP_STEPS = 2;
const MAX_GAP_STEPS = 6;

/**
 * Define a probabilidade de criação de paredes no labirinto com base no tamanho do grid.
 * Grids menores precisam de menos paredes para evitar bloqueios excessivos.
 * @param {number} gridSize — O tamanho atual do grid (ex: 8 para 8x8).
 * @returns {number} A probabilidade (entre 0 e 1) de gerar uma parede em uma aresta livre.
 */
const getWallProbability = (gridSize) => {
    if (gridSize <= 5) return 0.05; // Muito poucas paredes em grids pequenos
    if (gridSize <= 8) return 0.15; // Poucas paredes em grids médios
    return 0.28;                    // Quantidade normal para grids grandes
};

// Vetor de deltas representando os 4 movimentos possíveis no grid (Cima, Baixo, Esquerda, Direita)
const DELTAS = [
    { dr: -1, dc: 0 }, // Cima
    { dr: 1, dc: 0 },  // Baixo
    { dr: 0, dc: -1 }, // Esquerda
    { dr: 0, dc: 1 },  // Direita
];

/**
 * Gera uma chave de texto única para identificar uma posição (linha, coluna) no mapa ou set.
 * @param {number} r — Linha (row).
 * @param {number} c — Coluna (column).
 * @returns {string} Chave no formato "r-c".
 */
const posKey = (r, c) => `${r}-${c}`;

/**
 * Gera uma chave de texto única para identificar uma aresta (borda entre duas células adjacentes).
 * Garante que a ordem das células (a->b ou b->a) produza sempre a mesma chave lexicográfica.
 * @param {Object} a — Coordenada da primeira célula {r, c}.
 * @param {Object} b — Coordenada da segunda célula {r, c}.
 * @returns {string} Chave no formato "r1-c1|r2-c2".
 */
const edgeKey = (a, b) => {
    const ka = posKey(a.r, a.c);
    const kb = posKey(b.r, b.c);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

/**
 * Verifica se uma coordenada (r, c) está dentro dos limites válidos do tabuleiro.
 * @param {number} r — Linha.
 * @param {number} c — Coluna.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {boolean} True se estiver dentro do grid.
 */
const inBounds = (r, c, gridSize) => r >= 0 && c >= 0 && r < gridSize && c < gridSize;

/**
 * Verifica se duas células são estritamente adjacentes (vizinhas ortogonais).
 * @param {Object} a — Primeira célula {r, c}.
 * @param {Object} b — Segunda célula {r, c}.
 * @returns {boolean} True se a distância de Manhattan for exatamente 1.
 */
const areAdjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

/**
 * Cria uma cópia imutável de um objeto de coordenada.
 * @param {Object} pos — Coordenada {r, c}.
 * @returns {Object} Nova instância {r, c}.
 */
const copyPos = (pos) => ({ r: pos.r, c: pos.c });

/**
 * Verifica se uma determinada célula está localizada em um dos 4 cantos extremos do tabuleiro.
 * @param {number} r — Linha.
 * @param {number} c — Coluna.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {boolean} True se for um canto.
 */
const isCornerCell = (r, c, gridSize) => {
    const last = gridSize - 1;
    return (r === 0 || r === last) && (c === 0 || c === last);
};

/**
 * Retorna o intervalo permitido de distância (min e max) entre letras consecutivas.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {Object} Objeto contendo {min, max}.
 */
const getGapRange = (gridSize) => ({ min: MIN_GAP_STEPS, max: MAX_GAP_STEPS });

/**
 * Verifica se um caminho (segmento de células) é válido e não atravessa nenhuma parede bloqueada.
 * @param {Array} path — Array de coordenadas [{r, c}].
 * @param {Set} blockedEdges — Set contendo as chaves das arestas bloqueadas (paredes).
 * @param {number} gridSize — Dimensão do grid.
 * @returns {boolean} True se o caminho for contínuo, dentro dos limites e sem colisões.
 */
const isValidSegment = (path, blockedEdges, gridSize) => {
    if (!Array.isArray(path) || path.length < 2) return false;

    for (let i = 0; i < path.length; i += 1) {
        const p = path[i];
        if (!inBounds(p.r, p.c, gridSize)) return false;

        if (i > 0) {
            const prev = path[i - 1];
            if (!areAdjacent(prev, p)) return false;
            if (blockedEdges.has(edgeKey(prev, p))) return false;
        }
    }

    return true;
};

/**
 * Realiza uma verificação rigorosa para garantir que o labirinto gerado tem solução válida.
 * Confirma se os checkpoints da palavra podem ser alcançados na ordem correta sem ciclos ou bloqueios.
 * @param {Object} params — Parâmetros de validação (palavra, checkpoints, paredes, caminhos, tamanho do grid).
 * @returns {boolean} True se o round for perfeitamente completável.
 */
const isRoundCompletable = ({ word, checkpoints, blockedEdges, solutionPaths, gridSize }) => {
    if (!word || !Array.isArray(checkpoints) || checkpoints.length !== word.length) {
        return false;
    }
    if (!Array.isArray(solutionPaths) || solutionPaths.length !== Math.max(0, checkpoints.length - 1)) {
        return false;
    }

    const trail = [];
    for (let idx = 0; idx < solutionPaths.length; idx += 1) {
        const segment = solutionPaths[idx];
        if (!isValidSegment(segment, blockedEdges, gridSize)) {
            return false;
        }

        if (idx === 0) {
            trail.push(...segment);
        } else {
            // Evita duplicar o checkpoint de junção entre dois segmentos.
            trail.push(...segment.slice(1));
        }
    }

    if (trail.length === 0) return false;

    // Confirma que a trilha não passa pela mesma célula duas vezes (sem auto-interseção)
    const visited = new Set();
    for (let i = 0; i < trail.length; i += 1) {
        const key = posKey(trail[i].r, trail[i].c);
        if (visited.has(key)) {
            return false;
        }
        visited.add(key);
    }

    // Confirma que todos os checkpoints aparecem na trilha e exatamente na ordem da palavra
    let checkpointCursor = 0;
    for (let i = 0; i < trail.length && checkpointCursor < checkpoints.length; i += 1) {
        const t = trail[i];
        const cp = checkpoints[checkpointCursor];
        if (t.r === cp.r && t.c === cp.c) {
            checkpointCursor += 1;
        }
    }

    return checkpointCursor === checkpoints.length;
};

/**
 * Gera as coordenadas de destino (checkpoints) para cada letra da palavra no grid.
 * Realiza múltiplas tentativas para encontrar uma distribuição que respeite as regras de distância.
 * @param {string} word — A palavra a ser distribuída.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {Array|null} Array de coordenadas [{r, c}] ou null se falhar.
 */
const generateLetterPath = (word, gridSize) => {
    const maxAttempts = gridSize <= 5 ? 5000 : (gridSize <= 8 ? 2000 : 1000);
    console.log(`[generateLetterPath] Tentando gerar path para "${word}" (grid ${gridSize})`);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const checkpoints = [];
        const visited = new Set();

        // Escolhe um ponto de partida aleatório para a primeira letra
        const start = {
            r: Math.floor(Math.random() * gridSize),
            c: Math.floor(Math.random() * gridSize),
        };
        checkpoints.push(start);
        visited.add(posKey(start.r, start.c));

        let ok = true;
        let current = start;

        // Tenta posicionar as letras subsequentes da palavra
        for (let i = 1; i < word.length; i += 1) {
            const gaps = getGapRange(gridSize);
            const minDistance = gaps.min;
            const maxDistance = gaps.max;
            const isMiddleLetter = i > 0 && i < word.length - 1;
            const candidates = [];

            for (let r = 0; r < gridSize; r += 1) {
                for (let c = 0; c < gridSize; c += 1) {
                    const candidate = { r, c };
                    const key = posKey(r, c);
                    if (visited.has(key)) continue;

                    // Regra de design: letras intermediárias não podem ficar nos cantos (evita caminhos presos)
                    if (gridSize >= 8 && isMiddleLetter && isCornerCell(r, c, gridSize)) continue;

                    // Calcula a distância de Manhattan da posição atual até o candidato
                    const manhattan = Math.abs(candidate.r - current.r) + Math.abs(candidate.c - current.c);
                    if (manhattan >= minDistance && manhattan <= maxDistance) {
                        candidates.push({ ...candidate, manhattan });
                    }
                }
            }

            // Se não houver candidatos válidos, aborta esta tentativa
            if (candidates.length === 0) {
                ok = false;
                break;
            }

            // Ordena os candidatos dando preferência para os mais distantes dentro do limite
            candidates.sort((a, b) => b.manhattan - a.manhattan);
            const poolSize = Math.max(1, Math.ceil(candidates.length / 3));
            const next = candidates[Math.floor(Math.random() * poolSize)];
            checkpoints.push(next);
            visited.add(posKey(next.r, next.c));
            current = next;
        }

        if (ok && checkpoints.length === word.length) {
            // [SILENCED] Success log removed: generateLetterPath succeeded
            return checkpoints;
        }
    }

    console.warn(`[generateLetterPath] ✗ Falha após ${maxAttempts} tentativas`);
    return null;
};

/**
 * Fallback determinístico para posicionar letras quando a heurística aleatória falha.
 * Tenta colocar as letras em linha (horizontal ou vertical) respeitando um espaçamento mínimo.
 * @param {string} word
 * @param {number} gridSize
 * @returns {Array|null}
 */
const deterministicPlacement = (word, gridSize) => {
    const len = word.length;
    const baseGap = Math.max(1, MIN_GAP_STEPS);

    // Tenta horizontalmente em todas as linhas
    for (let gap = baseGap; gap >= 1; gap -= 1) {
        for (let r = 0; r < gridSize; r += 1) {
            for (let startC = 0; startC < gridSize; startC += 1) {
                const cps = [];
                let c = startC;
                let ok = true;
                for (let i = 0; i < len; i += 1) {
                    if (c >= gridSize) { ok = false; break; }
                    cps.push({ r, c });
                    c += gap;
                }
                if (ok && cps.length === len) return cps;
            }
        }
    }

    // Tenta verticalmente em todas as colunas
    for (let gap = baseGap; gap >= 1; gap -= 1) {
        for (let c = 0; c < gridSize; c += 1) {
            for (let startR = 0; startR < gridSize; startR += 1) {
                const cps = [];
                let r = startR;
                let ok = true;
                for (let i = 0; i < len; i += 1) {
                    if (r >= gridSize) { ok = false; break; }
                    cps.push({ r, c });
                    r += gap;
                }
                if (ok && cps.length === len) return cps;
            }
        }
    }

    return null;
};

/**
 * Constrói um caminho livre de obstáculos (solução) entre dois checkpoints usando Busca em Largura (BFS).
 * Evita passar por células proibidas ou outros checkpoints fora de ordem.
 * @param {Object} start — Coordenada inicial.
 * @param {Object} target — Coordenada destino.
 * @param {Set} blockedEdges — Set de arestas bloqueadas.
 * @param {Set} forbiddenCells — Set de células já utilizadas por caminhos anteriores.
 * @param {Set} checkpointCells — Set contendo todos os checkpoints da palavra.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {Array|null} Array com o caminho de coordenadas ou null se não encontrar rota.
 */
const buildPathBetween = (
    start,
    target,
    blockedEdges,
    forbiddenCells,
    checkpointCells,
    gridSize,
) => {
    const startK = posKey(start.r, start.c);
    const targetK = posKey(target.r, target.c);

    if (startK === targetK) return [start];

    const queue = [copyPos(start)];
    const seen = new Set([startK]);
    const prev = new Map();

    // Proteção contra loops infinitos (limite máximo de iterações)
    const MAX_ITERATIONS = gridSize * gridSize * 2;
    let iterations = 0;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations += 1;
        const current = queue.shift();
        const currentK = posKey(current.r, current.c);

        // Se alcançou o destino, faz o caminho de volta (backtracking) para montar a rota
        if (currentK === targetK) {
            const path = [copyPos(target)];
            let walk = prev.get(currentK);
            let pathWalkIterations = 0;

            while (walk !== startK && pathWalkIterations < MAX_ITERATIONS) {
                pathWalkIterations += 1;
                const [wr, wc] = walk.split("-").map(Number);
                path.push({ r: wr, c: wc });
                walk = prev.get(walk);

                if (!walk) {
                    break;
                }
            }

            path.push(copyPos(start));
            return path.reverse();
        }

        // Explora os vizinhos nas 4 direções
        for (const d of DELTAS) {
            const next = { r: current.r + d.dr, c: current.c + d.dc };
            if (!inBounds(next.r, next.c, gridSize)) continue;
            const nextK = posKey(next.r, next.c);
            if (seen.has(nextK)) continue;
            if (blockedEdges.has(edgeKey(current, next))) continue; // Não atravessa paredes
            if (forbiddenCells.has(nextK) && nextK !== targetK) continue; // Não invade caminhos anteriores
            if (checkpointCells.has(nextK) && nextK !== targetK && nextK !== startK) continue; // Não fura checkpoints

            seen.add(nextK);
            prev.set(nextK, currentK);
            queue.push(next);
        }
    }

    return null;
};

/**
 * Constrói as paredes do labirinto (arestas bloqueadas).
 * Primeiro garante que existe um caminho limpo entre todos os checkpoints da palavra,
 * e depois espalha paredes aleatórias pelo resto do tabuleiro.
 * @param {Array} checkpoints — Array de coordenadas dos checkpoints.
 * @param {number} gridSize — Dimensão do grid.
 * @returns {Object|null} Objeto contendo { blocked, solutionPaths } ou null se falhar.
 */
const buildBlockedEdges = (checkpoints, gridSize) => {
    console.log(`[buildBlockedEdges] Iniciando para ${checkpoints.length} checkpoints no grid ${gridSize}`);
    const blocked = new Set();
    const solutionEdges = new Set();

    const solutionPaths = [];
    const forbiddenCells = new Set();
    const checkpointCells = new Set(checkpoints.map((pos) => posKey(pos.r, pos.c)));

    // 1. Conecta cada par de checkpoints consecutivos para formar a solução garantida
    for (let i = 0; i < checkpoints.length - 1; i += 1) {
        let between = buildPathBetween(
            checkpoints[i],
            checkpoints[i + 1],
            blocked,
            forbiddenCells,
            checkpointCells,
            gridSize,
        );
        if (!between || between.length < 1) {
            console.warn(`[buildBlockedEdges] ✗ Falha ao conectar checkpoint ${i} → ${i + 1} (primeira tentativa)`);

            // Tentativa de fallback: permitir reutilizar células de caminhos anteriores
            // (relaxa `forbiddenCells` para aumentar a chance de encontrar uma rota).
            console.warn(`[buildBlockedEdges] Tentando fallback relaxado para conectar checkpoint ${i} → ${i + 1}`);
            const relaxed = buildPathBetween(
                checkpoints[i],
                checkpoints[i + 1],
                blocked,
                new Set(), // proibimos nada — permite reutilizar células
                checkpointCells,
                gridSize,
            );

            if (!relaxed || relaxed.length < 1) {
                console.warn(`[buildBlockedEdges] ✗ Fallback também falhou para checkpoint ${i} → ${i + 1}`);
                return null;
            }

            // Use o caminho relaxado se teve sucesso
            between = relaxed;
        }
        solutionPaths.push(between);
        between.forEach((pos) => forbiddenCells.add(posKey(pos.r, pos.c)));
        for (let j = 0; j < between.length - 1; j += 1) {
            solutionEdges.add(edgeKey(between[j], between[j + 1]));
        }
    }

    // 2. Percorre todas as arestas do grid adicionando paredes aleatórias onde NÃO for caminho de solução
    for (let r = 0; r < gridSize; r += 1) {
        for (let c = 0; c < gridSize; c += 1) {
            const wallProb = getWallProbability(gridSize);

            // Checa aresta horizontal (direita)
            if (c + 1 < gridSize) {
                const a = { r, c };
                const b = { r, c: c + 1 };
                const key = edgeKey(a, b);
                if (!solutionEdges.has(key) && Math.random() < wallProb) {
                    blocked.add(key);
                }
            }

            // Checa aresta vertical (baixo)
            if (r + 1 < gridSize) {
                const a = { r, c };
                const b = { r: r + 1, c };
                const key = edgeKey(a, b);
                if (!solutionEdges.has(key) && Math.random() < wallProb) {
                    blocked.add(key);
                }
            }
        }
    }

    // [SILENCED] Success log removed: buildBlockedEdges completed
    return { blocked, solutionPaths };
};

/**
 * Algoritmo de busca de caminho (BFS) utilizado para gerar dicas ao jogador.
 * Encontra a rota mais curta da posição atual até o próximo checkpoint correto.
 * @param {Object} params — Posição inicial, destino, paredes, células visitadas e tamanho do grid.
 * @returns {Array|null} Rota encontrada ou null.
 */
const findPath = ({ start, target, blockedEdges, visited, gridSize }) => {
    const startK = posKey(start.r, start.c);
    const targetK = posKey(target.r, target.c);

    if (startK === targetK) return [start];

    const queue = [start];
    const seen = new Set([startK]);
    const prev = new Map();

    while (queue.length > 0) {
        const current = queue.shift();
        const currentK = posKey(current.r, current.c);

        for (const d of DELTAS) {
            const next = { r: current.r + d.dr, c: current.c + d.dc };
            if (!inBounds(next.r, next.c, gridSize)) continue;
            if (blockedEdges.has(edgeKey(current, next))) continue;

            const nextK = posKey(next.r, next.c);
            if (seen.has(nextK)) continue;
            if (visited.has(nextK) && nextK !== targetK) continue;

            seen.add(nextK);
            prev.set(nextK, currentK);

            if (nextK === targetK) {
                const result = [next];
                let walk = currentK;
                while (walk !== startK) {
                    const [wr, wc] = walk.split("-").map(Number);
                    result.push({ r: wr, c: wc });
                    walk = prev.get(walk);
                }
                result.push(start);
                return result.reverse();
            }

            queue.push(next);
        }
    }

    return null;
};

/**
 * Converte a relação entre duas coordenadas adjacentes em um texto de direção em português.
 * @param {Object} from — Célula de origem.
 * @param {Object} to — Célula de destino.
 * @returns {string} "cima", "baixo", "esquerda" ou "direita".
 */
const getDirectionName = (from, to) => {
    if (to.r < from.r) return "cima";
    if (to.r > from.r) return "baixo";
    if (to.c < from.c) return "esquerda";
    return "direita";
};

/**
 * Orquestra a geração completa de um round do jogo (escolha da palavra, posicionamento e labirinto).
 * Possui chamadas recursivas de fallback caso a geração aleatória encontre um beco sem saída.
 * @param {Array} words — Lista de palavras disponíveis.
 * @param {number} gridSize — Dimensão do grid.
 * @param {number} depth — Contador de profundidade da recursão para evitar stack overflow.
 * @returns {Object|null} Objeto do round completo ou null.
 */
const generateRound = (words, gridSize, depth = 0) => {
    const MAX_DEPTH = gridSize <= 5 ? 200 : (gridSize <= 8 ? 100 : 50);

    if (!words || words.length === 0) return null;
    if (depth > MAX_DEPTH) return null;

    // Filtra palavras que caibam no tamanho do grid
    const eligibleWords = words.filter((item) => item.word.length <= gridSize);
    const pool = eligibleWords.length > 0 ? eligibleWords : words;
    const wordObj = pool[Math.floor(Math.random() * pool.length)];
    const word = wordObj.word;
    const hint = wordObj.hint;

    // Tenta gerar os checkpoints para a palavra escolhida
    let checkpoints = generateLetterPath(word, gridSize);
    if (!checkpoints) {
        console.debug(`[LabirintoLogic] Falha em generateLetterPath depth=${depth}`);

        // Tenta fallback determinístico antes de recursar
        const det = deterministicPlacement(word, gridSize);
        if (det) {
            console.debug(`[LabirintoLogic] Usando fallback determinístico para palavra "${word}"`);
            checkpoints = det;
        } else {
            return generateRound(words, gridSize, depth + 1);
        }
    }

    const checkpointMap = new Map();
    checkpoints.forEach((p, idx) => checkpointMap.set(posKey(p.r, p.c), idx));

    // Inicializa a matriz do grid com objetos vazios
    const grid = Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => ({ key: posKey(r, c), letter: "" })),
    );

    checkpoints.forEach((p, idx) => {
        grid[p.r][p.c].letter = word[idx];
    });

    // Tenta construir as paredes e caminhos
    const blockedResult = buildBlockedEdges(checkpoints, gridSize);
    if (!blockedResult) {
        console.debug(`[LabirintoLogic] Falha em buildBlockedEdges depth=${depth}`);
        return generateRound(words, gridSize, depth + 1);
    }
    const { blocked: blockedEdges, solutionPaths } = blockedResult;

    checkpoints.forEach((p, idx) => {
        grid[p.r][p.c].letter = word[idx];
    });

    const candidateRound = {
        word,
        hint, // <--- Dica da palavra vinculada
        checkpoints,
        checkpointMap,
        blockedEdges,
        solutionPaths,
        grid,
    };

    // Validação final de completabilidade para grids maiores
    if (gridSize >= 8) {
        if (!isRoundCompletable({
            word,
            checkpoints,
            blockedEdges,
            solutionPaths,
            gridSize,
        })) {
            console.debug(`[LabirintoLogic] Falha em isRoundCompletable depth=${depth}`);
            return generateRound(words, gridSize, depth + 1);
        }
    }

    // [SILENCED] Success log removed: generateRound accepted a candidate
    return candidateRound;
};

/**
 * Gerador de round determinístico e 100% garantido.
 * Constrói um caminho serpentina contínuo (auto-evitante) pelo tabuleiro, distribuindo os checkpoints
 * e paredes sem chance de becos sem saída ou auto-interseção.
 * @param {Array} words - Lista de palavras candidatas.
 * @param {number} gridSize - Dimensão do grid.
 * @returns {Object} Round completo e válido.
 */
const createGuaranteedRound = (words, gridSize) => {
    const wordPool = (Array.isArray(words) && words.length > 0) ? words : DEFAULT_FALLBACK_WORDS;
    const eligible = wordPool.filter((item) => item.word.length <= gridSize * gridSize);
    const pool = eligible.length > 0 ? eligible : DEFAULT_FALLBACK_WORDS;
    const wordObj = pool[Math.floor(Math.random() * pool.length)] || DEFAULT_FALLBACK_WORDS[0];
    const word = String(wordObj.word || "SAIDA").toUpperCase();
    const hint = wordObj.hint || "";
    const len = word.length;

    // Constrói trilha serpentina no grid
    const fullTrail = [];
    const maxRows = Math.min(gridSize, Math.ceil(len * 2 / gridSize) + 2);
    let direction = 1;
    const startRow = Math.max(0, Math.floor(Math.random() * Math.max(1, gridSize - maxRows)));

    for (let r = startRow; r < gridSize && fullTrail.length < Math.max(len * 2, gridSize * 2); r += 1) {
        if (direction === 1) {
            for (let c = 0; c < gridSize; c += 1) {
                fullTrail.push({ r, c });
            }
        } else {
            for (let c = gridSize - 1; c >= 0; c -= 1) {
                fullTrail.push({ r, c });
            }
        }
        direction *= -1;
    }

    const totalTrailCells = fullTrail.length;
    const step = Math.max(1, Math.min(2, Math.floor((totalTrailCells - 1) / Math.max(1, len - 1))));

    const checkpoints = [];
    const solutionPaths = [];
    const solutionEdges = new Set();
    const checkpointIndices = [];

    for (let i = 0; i < len; i += 1) {
        const trailIdx = Math.min(totalTrailCells - 1, i * step);
        const cp = fullTrail[trailIdx];
        checkpoints.push(cp);
        checkpointIndices.push(trailIdx);
    }

    for (let i = 0; i < len - 1; i += 1) {
        const segStart = checkpointIndices[i];
        const segEnd = checkpointIndices[i + 1];
        const segment = fullTrail.slice(segStart, segEnd + 1);
        solutionPaths.push(segment);
        for (let j = 0; j < segment.length - 1; j += 1) {
            solutionEdges.add(edgeKey(segment[j], segment[j + 1]));
        }
    }

    const checkpointMap = new Map();
    const grid = Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => ({ key: posKey(r, c), letter: "" })),
    );

    checkpoints.forEach((p, idx) => {
        checkpointMap.set(posKey(p.r, p.c), idx);
        grid[p.r][p.c].letter = word[idx];
    });

    const blocked = new Set();
    const wallProb = 0.12;
    for (let r = 0; r < gridSize; r += 1) {
        for (let c = 0; c < gridSize; c += 1) {
            if (c + 1 < gridSize) {
                const key = edgeKey({ r, c }, { r, c: c + 1 });
                if (!solutionEdges.has(key) && Math.random() < wallProb) {
                    blocked.add(key);
                }
            }
            if (r + 1 < gridSize) {
                const key = edgeKey({ r, c }, { r: r + 1, c });
                if (!solutionEdges.has(key) && Math.random() < wallProb) {
                    blocked.add(key);
                }
            }
        }
    }

    return {
        word,
        hint,
        checkpoints,
        checkpointMap,
        blockedEdges: blocked,
        solutionPaths,
        grid,
    };
};

/**
 * Exibe informações detalhadas de depuração no console caso a geração do labirinto falhe completamente.
 */
const debugRoundFailure = ({ source, words, gridSize }) => {
    const safeWords = Array.isArray(words) ? words : [];
    const lengths = safeWords
        .map((w) => String(w?.word ?? w ?? "").trim().length)
        .filter((n) => n > 0);
    const uniqueLengths = Array.from(new Set(lengths)).sort((a, b) => a - b);
};

/**
 * Wrapper de geração de round que aciona o debug automático e fallback garantido em caso de falha.
 */
const createRoundWithDebug = ({ words, gridSize, source }) => {
    const wordPool = (Array.isArray(words) && words.length > 0) ? words : DEFAULT_FALLBACK_WORDS;
    const safeGridSize = Math.max(4, Number(gridSize) || DEFAULT_GRID_SIZE);

    let round = generateRound(wordPool, safeGridSize);
    if (!round) {
        debugRoundFailure({ source, words: wordPool, gridSize: safeGridSize });
        round = createGuaranteedRound(wordPool, safeGridSize);
    }
    return round;
};

/**
 * Analisa a trilha atual do jogador e determina o progresso alcançado na formação da palavra.
 * @param {Object} params — Trilha atual, mapa de checkpoints, grid e palavra.
 * @returns {Object} Objeto contendo { progress, matchedKeys }.
 */
const getSequenceStateFromTrail = ({ trail, checkpointMap, grid, word }) => {
    let nextExpectedIndex = 0;
    const matchedKeys = [];
    const usedCheckpointKeys = new Set();

    trail.forEach((pos) => {
        if (nextExpectedIndex >= word.length) return;

        const key = posKey(pos.r, pos.c);
        if (!checkpointMap.has(key) || usedCheckpointKeys.has(key)) return;

        const letter = grid[pos.r]?.[pos.c]?.letter ?? "";
        if (letter === word[nextExpectedIndex]) {
            usedCheckpointKeys.add(key);
            matchedKeys.push(key);
            nextExpectedIndex += 1;
        }
    });

    return {
        progress: nextExpectedIndex - 1,
        matchedKeys,
    };
};

/**
 * Custom Hook principal contendo toda a lógica de estado, tempo, validação de regras e geometria do jogo Labirinto.
 * @param {Object} props — Propriedades e callbacks passadas pelo componente pai.
 */
export default function useLabirintoLogic({
    data = {},
    config = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    const { words = [] } = data;
    const rawGridSize = config.gridSize ?? DEFAULT_GRID_SIZE;
    const gridSize = rawGridSize <= 8 ? 8 : 10; // Clamp de segurança: apenas 8 ou 10
    const { timeLimitSeconds = 30 } = config;
    const pointsToWin = Math.max(0, Number(config.pointsToWin ?? 50));
    const labirintoWordLength = config.labirintoWordLength ?? null;
    const labirintoWordLengthIsMin = !!config.labirintoWordLengthIsMin;

    const rawWords = Array.isArray(words) && words.length > 0 ? words : DEFAULT_FALLBACK_WORDS;

    const filteredWords = useMemo(() => {
        const norm = rawWords
            .map((item) => {
                if (typeof item === "string") {
                    return { word: item.trim().toUpperCase(), hint: "" };
                }
                return {
                    word: String(item?.word ?? item?.text ?? item?.value ?? "").trim().toUpperCase(),
                    hint: String(item?.hint ?? "").trim()
                };
            })
            .filter((item) => item.word.length > 0);

        if (labirintoWordLength !== null && labirintoWordLength !== undefined) {
            return norm.filter((item) =>
                labirintoWordLengthIsMin ? item.word.length >= Number(labirintoWordLength) : item.word.length === Number(labirintoWordLength)
            );
        }

        return norm;
    }, [rawWords, labirintoWordLength, labirintoWordLengthIsMin]);

    const hasAnyWords = rawWords.length > 0;
    const noWords = filteredWords.length === 0 && !hasAnyWords;
    const configurationIssue = filteredWords.length === 0 && hasAnyWords;
    const configurationMessage = configurationIssue
        ? `Nao existem palavras com ${labirintoWordLength} letras. Ajuste essa quantidade no Admin.`
        : "";
    const playBlocked = noWords || configurationIssue;

    // Estado do round atual contendo o grid, palavra e posições
    const [round, setRound] = useState(() => {
        const pool = (filteredWords && filteredWords.length > 0)
            ? filteredWords
            : (!configurationIssue ? DEFAULT_FALLBACK_WORDS : null);
        if (pool) {
            return createRoundWithDebug({
                words: pool,
                gridSize,
                source: "initial-state",
            });
        }
        return null;
    });

    // Estados de controle do jogo
    const [progress, setProgress] = useState(-1);                     // Progresso na palavra (-1 = início)
    const [trail, setTrail] = useState([]);                           // Array da trilha
    const [trailSet, setTrailSet] = useState(new Set());              // Set da trilha para busca rápida
    const [matchedCheckpointKeys, setMatchedCheckpointKeys] = useState([]); // Chaves dos checkpoints alcançados
    const [dragging, setDragging] = useState(false);                  // Flag indicando se o usuário está arrastando
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);       // Cronômetro regressivo
    const [finished, setFinished] = useState(false);                  // Flag de fim de jogo
    const [timedOut, setTimedOut] = useState(false);                  // Flag de fim por tempo esgotado
    const [reported, setReported] = useState(false);                  // Flag de pontuação já enviada
    const [hintText, setHintText] = useState("");                     // Texto de dica
    const boardRef = useRef(null);                                    // Referência DOM do tabuleiro
    const [boardSize, setBoardSize] = useState(480);                  // Largura do tabuleiro em pixels

    // Extração de propriedades do round atual
    const word = round?.word ?? "";
    const checkpoints = round?.checkpoints ?? [];
    const checkpointMap = round?.checkpointMap ?? new Map();
    const blockedEdges = round?.blockedEdges ?? new Set();
    const grid = round?.grid ?? [];
    const currentPos = trail.length > 0 ? trail[trail.length - 1] : null;
    const shouldMarkFirstCheckpoint = progress < 0;
    const boardGridSize = Math.max(4, gridSize || DEFAULT_GRID_SIZE);

    // Efeito para monitorar o tamanho real do tabuleiro na tela (responsividade via ResizeObserver)
    useEffect(() => {
        if (!boardRef.current) return undefined;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect?.width;
            if (width) setBoardSize(width);
        });
        observer.observe(boardRef.current);
        return () => observer.disconnect();
    }, []);

    // Função para limpar a tentativa atual e recomeçar do zero
    const resetAttempt = () => {
        setProgress(-1);
        setTrail([]);
        setTrailSet(new Set());
        setMatchedCheckpointKeys([]);
        setDragging(false);
        setHintText("");
    };

    // Função para iniciar uma nova partida com outra palavra
    const newGame = () => {
        const pool = (filteredWords && filteredWords.length > 0)
            ? filteredWords
            : (!configurationIssue ? DEFAULT_FALLBACK_WORDS : null);

        if (pool) {
            setRound(createRoundWithDebug({
                words: pool,
                gridSize: boardGridSize,
                source: "newGame",
            }));
        } else {
            setRound(null);
        }
        setProgress(-1);
        setTrail([]);
        setTrailSet(new Set());
        setMatchedCheckpointKeys([]);
        setDragging(false);
        setTimeLeft(timeLimitSeconds);
        setFinished(false);
        setTimedOut(false);
        setReported(false);
        setHintText("");
    };

    // Reinicia o jogo caso o tempo limite configurado mude
    useEffect(() => {
        newGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLimitSeconds]);

    const wordsKey = useMemo(() => JSON.stringify(filteredWords), [filteredWords]);

    // Atualiza o round caso a lista de palavras ou o tamanho do grid mudem
    useEffect(() => {
        const pool = (filteredWords && filteredWords.length > 0)
            ? filteredWords
            : (!configurationIssue ? DEFAULT_FALLBACK_WORDS : null);

        if (pool) {
            setRound(createRoundWithDebug({
                words: pool,
                gridSize: boardGridSize,
                source: "words-or-grid-change",
            }));
        } else {
            setRound(null);
        }
        setProgress(-1);
        setTrail([]);
        setTrailSet(new Set());
        setMatchedCheckpointKeys([]);
        setDragging(false);
        setTimeLeft(timeLimitSeconds);
        setFinished(false);
        setTimedOut(false);
        setReported(false);
        setHintText("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wordsKey, boardGridSize]);

    // Cronômetro regressivo com precisão em centésimos
    useEffect(() => {
        if (finished || playBlocked) return undefined;

        const endTime = Date.now() + timeLimitSeconds * 1000;
        const tick = () => {
            const remainingMs = Math.max(0, endTime - Date.now());
            const remainingSec = remainingMs / 1000;
            setTimeLeft(remainingSec);
            if (remainingMs <= 0) {
                setFinished(true);
                setTimedOut(true);
            }
        };
        const id = setInterval(tick, 50);
        tick();
        return () => clearInterval(id);
    }, [finished, playBlocked, timeLimitSeconds]);

    // Verifica condição de vitória (se alcançou a última letra da palavra)
    useEffect(() => {
        if (word && progress === word.length - 1 && !finished) {
            setFinished(true);
        }
    }, [progress, word, finished, playBlocked, filteredWords, boardGridSize]);

    // Efeito executado ao finalizar a partida para repassar a pontuação ao sistema global
    useEffect(() => {
        if (finished && !reported && !playBlocked) {
            const partialPoints = Math.floor((Math.max(0, progress + 1) / (word.length || 1)) * 100);
            const payload = {
                game: "Labirinto",
                score: partialPoints,
                points: partialPoints,
                remainingSeconds: timedOut ? 0 : wholeSeconds(timeLeft),
                timedOut,
            };
            const finalPayload = sanitizeGamePayload(payload);
            const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
            const elapsed = Math.max(0, Math.floor(timeLimitSeconds - timeLeft));
            const totalScore = Math.max(
                0,
                Math.round(Number(payload.score ?? payload.points ?? 0) + (payload.timedOut ? 0 : remaining)),
            );
            const dialogPayload = {
                game: String(payload.game),
                score: totalScore,
                totalScore,
                remainingSeconds: elapsed,
                elapsedSeconds: elapsed,
                timedOut: !!payload.timedOut,
                targetScore: pointsToWin,
                won: Number(payload.score ?? payload.points ?? 0) >= pointsToWin,
                correctWord: word,
            };

            onScore?.(finalPayload);

            if (timedOut) {
                onGameOver?.(finalPayload);
            } else {
                onRoundComplete?.(finalPayload);
            }

            // Notifica Dialog central (payload sanitizado)
            import("../../Dialog/gameEndReporter")
                .then((m) => {
                    if (m.reportGameEnd) {
                        m.reportGameEnd(dialogPayload);
                    }
                })
                .catch(() => { });

            setReported(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished, reported, onScore, onRoundComplete, onGameOver, progress, word, timeLeft, timedOut, playBlocked]);

    // Lógica central de validação de movimento ao interagir com o tabuleiro
    const attemptMove = (r, c) => {
        if (finished || !round || playBlocked) return;

        // 1. Se a trilha está vazia, o jogador DEVE começar obrigatoriamente pela primeira letra da palavra
        if (trail.length === 0) {
            const key = posKey(r, c);
            const isCheckpoint = checkpointMap.has(key);
            const isValidFirstLetter = grid[r]?.[c]?.letter === word[0];
            if (!isCheckpoint || !isValidFirstLetter) {
                return;
            }
            const nextTrail = [{ r, c }];
            const nextSet = new Set([key]);
            const nextState = getSequenceStateFromTrail({ trail: nextTrail, checkpointMap, grid, word });
            setTrail(nextTrail);
            setTrailSet(nextSet);
            setProgress(nextState.progress);
            setMatchedCheckpointKeys(nextState.matchedKeys);
            setHintText("");
            return;
        }

        const from = trail[trail.length - 1];
        const to = { r, c };
        const toKey = posKey(r, c);
        const previous = trail.length > 1 ? trail[trail.length - 2] : null;

        // 2. Permite voltar atrás (desfazer o último passo) se clicar na célula anterior
        if (previous && toKey === posKey(previous.r, previous.c)) {
            const nextTrail = trail.slice(0, -1);
            const nextSet = new Set(nextTrail.map((pos) => posKey(pos.r, pos.c)));
            const nextState = getSequenceStateFromTrail({ trail: nextTrail, checkpointMap, grid, word });
            setTrail(nextTrail);
            setTrailSet(nextSet);
            setProgress(nextState.progress);
            setMatchedCheckpointKeys(nextState.matchedKeys);
            setHintText("");
            return;
        }

        // 3. Validações de bloqueio: checa adjacência, colisões com paredes e se já passou pela célula
        if (!areAdjacent(from, to)) return;
        if (blockedEdges.has(edgeKey(from, to))) {
            return; // Bloqueado por uma parede
        }
        if (trailSet.has(toKey)) {
            return; // Célula já visitada na trilha atual
        }

        // 4. Movimento válido: atualiza a trilha e recalcula o progresso
        const nextTrail = [...trail, to];
        const nextSet = new Set(trailSet);
        nextSet.add(toKey);
        const nextState = getSequenceStateFromTrail({ trail: nextTrail, checkpointMap, grid, word });

        setTrail(nextTrail);
        setTrailSet(nextSet);
        setProgress(nextState.progress);
        setMatchedCheckpointKeys(nextState.matchedKeys);
        setHintText("");
    };

    // Manipuladores de eventos de clique e arraste (Pointer Events)
    const startDrag = (r, c) => {
        setDragging(true);
        attemptMove(r, c);
    };

    const dragOver = (r, c) => {
        if (!dragging) return;
        attemptMove(r, c);
    };

    const endDrag = () => setDragging(false);
    const handleClick = (r, c) => {
        if (dragging) return;
        attemptMove(r, c);
    };

    // Função para calcular e exibir uma dica de direção ao jogador
    const showHint = () => {
        if (finished || playBlocked) return;

        // Se ainda não começou, indica onde está a primeira letra
        if (trail.length === 0) {
            const start = checkpoints[0];
            setHintText(start ? `Comece na letra ${word[0]} em (${start.r + 1}, ${start.c + 1}).` : "Sem dica disponivel.");
            return;
        }

        const nextLetter = word[progress + 1];
        if (!nextLetter || !currentPos) return;

        // Busca candidatos no grid que contenham a próxima letra esperada
        const matchedSet = new Set(matchedCheckpointKeys);
        const candidates = checkpoints.filter((pos) => {
            const key = posKey(pos.r, pos.c);
            return grid[pos.r]?.[pos.c]?.letter === nextLetter && !matchedSet.has(key);
        });

        // Encontra a rota mais curta até o candidato correto
        let bestRoute = null;
        candidates.forEach((target) => {
            const route = findPath({ start: currentPos, target, blockedEdges, visited: trailSet, gridSize: boardGridSize });

            if (!route || route.length < 2) return;
            if (!bestRoute || route.length < bestRoute.length) {
                bestRoute = route;
            }
        });

        if (!bestRoute || bestRoute.length < 2) {
            setHintText("Sem rota valida a partir da posicao atual.");
            return;
        }

        const next = bestRoute[1];
        const dir = getDirectionName(currentPos, next);
        setHintText(`Proximo passo: ${dir}.`);
    };

    const hasRound = Boolean(round && grid.length > 0);

    // Cálculo do padding dinâmico do tabuleiro para garantir alinhamento perfeito dos overlays
    let boardPadding = 16; // Padrão: 8px de cada lado (8*2)
    if (boardRef.current) {
        const computed = window.getComputedStyle(boardRef.current);
        const paddingValue = parseFloat(computed.padding);
        boardPadding = paddingValue * 2;
    }
    const effectiveBoardSize = Math.max(boardSize - boardPadding, 100);
    const cellSize = effectiveBoardSize / boardGridSize; // Tamanho exato de cada célula em pixels

    // Cálculo memoizado das coordenadas absolutas de cada parede (Overlay de Paredes)
    const wallSegments = useMemo(() => {
        if (!round) return [];
        const segments = [];
        const t = Math.max(6, cellSize * 0.12); // Espessura da parede proporcional à célula

        for (let r = 0; r < boardGridSize; r += 1) {
            for (let c = 0; c < boardGridSize; c += 1) {
                // Parede vertical (à direita da célula)
                if (c + 1 < boardGridSize) {
                    const a = { r, c };
                    const b = { r, c: c + 1 };
                    if (blockedEdges.has(edgeKey(a, b))) {
                        segments.push({ key: `v-${r}-${c}`, x: (c + 1) * cellSize - t / 2, y: r * cellSize, width: t, height: cellSize });
                    }
                }

                // Parede horizontal (abaixo da célula)
                if (r + 1 < boardGridSize) {
                    const a = { r, c };
                    const b = { r: r + 1, c };
                    if (blockedEdges.has(edgeKey(a, b))) {
                        segments.push({ key: `h-${r}-${c}`, x: c * cellSize, y: (r + 1) * cellSize - t / 2, width: cellSize, height: t });
                    }
                }
            }
        }

        return segments;
    }, [round, blockedEdges, cellSize, boardGridSize]);

    // Cálculo memoizado das coordenadas absolutas das linhas da trilha (Overlay de Rastro)
    const trailSegments = useMemo(() => {
        const segs = [];
        if (trail.length === 0) return segs;

        const thickness = Math.max(10, cellSize * 0.24); // Espessura da linha do rastro

        for (let i = 0; i < trail.length - 1; i += 1) {
            const a = trail[i];
            const b = trail[i + 1];

            const x1 = a.c * cellSize + cellSize / 2;
            const y1 = a.r * cellSize + cellSize / 2;
            const x2 = b.c * cellSize + copyPos(b).c ? b.c * cellSize + cellSize / 2 : b.c * cellSize + cellSize / 2;
            const y2 = b.r * cellSize + cellSize / 2;

            if (a.r === b.r) {
                // Segmento horizontal
                segs.push({ key: `th-${i}`, x: Math.min(x1, x2), y: y1 - thickness / 2, width: Math.abs(x2 - x1), height: thickness });
            } else {
                // Segmento vertical
                segs.push({ key: `tv-${i}`, x: x1 - thickness / 2, y: Math.min(y1, y2), width: thickness, height: Math.abs(y2 - y1) });
            }
        }

        return segs;
    }, [trail, cellSize]);

    // Lista memoizada das letras já coletadas na trilha atual
    const collectedLetters = useMemo(() => trail.map((pos) => grid[pos.r]?.[pos.c]?.letter ?? "").filter(Boolean), [trail, grid]);

    // Retorna todo o estado e ações necessárias para o componente visual
    return {
        // Estado
        round,
        word,
        grid,
        checkpoints,
        checkpointMap,
        blockedEdges,
        progress,
        trail,
        trailSet,
        matchedCheckpointKeys,
        dragging,
        timeLeft,
        finished,
        timedOut,
        hintText,
        configurationIssue,
        configurationMessage,
        playBlocked,
        boardRef,
        boardSize,
        cellSize,
        hasRound,
        shouldMarkFirstCheckpoint,
        boardGridSize,
        collectedLetters,
        wallSegments,
        trailSegments,
        // Ações
        startDrag,
        dragOver,
        endDrag,
        handleClick,
        resetAttempt,
        newGame,
        showHint,
        posKey,
    };
}
