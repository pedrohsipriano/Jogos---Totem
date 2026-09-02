/**
 * MÓDULO GERADOR DE TABULEIRO PARA CAÇA-PALAVRAS (grid.js)
 * Contém o algoritmo responsável por criar uma matriz bidimensional, posicionar
 * uma lista de palavras aleatoriamente (na horizontal ou vertical) e preencher
 * as células restantes com letras aleatórias.
 *
 * @param {string[]} words - Array de palavras em letras maiúsculas a serem posicionadas no grid.
 * @param {number} size - Tamanho inicial desejado para a grade (ex: 10 para um tabuleiro 10x10).
 * @param {number} maxAttempts - Número máximo de tentativas globais para posicionar todas as palavras no grid atual.
 * @returns {string[][] | null} Matriz 2D contendo as letras do caça-palavras ou null caso não seja possível encaixar todas.
 */
export function generateGrid(words, size = 10, maxAttempts = 50, allowGrow = true) {
    // Ordena as palavras da maior para a menor. Posicionar palavras longas primeiro aumenta drasticamente
    // a taxa de sucesso do algoritmo de encaixe.
    const ordered = [...words].sort((a, b) => b.length - a.length);

    /**
     * Tenta gerar e preencher um grid de tamanho específico (currentSize).
     * @param {number} currentSize - Dimensão do tabuleiro nesta tentativa (ex: 10, 11, 12).
     * @returns {string[][] | null} Matriz preenchida ou null se falhar.
     */
    const attemptSize = (currentSize) => {
        // Função auxiliar para criar uma matriz vazia de tamanho currentSize x currentSize
        const emptyGrid = () =>
            Array.from({ length: currentSize }, () =>
                Array.from({ length: currentSize }, () => ""),
            );

        const directions = [
            { dr: 0, dc: 1, weight: 1.0 },
            { dr: 0, dc: -1, weight: 0.8 },
            { dr: 1, dc: 0, weight: 1.7 },
            { dr: -1, dc: 0, weight: 1.2 },
        ];

        const directionPool = directions.flatMap((dir) =>
            Array.from({ length: Math.max(1, Math.round(dir.weight * 10)) }, () => dir),
        );

        // Verifica se é possível posicionar uma palavra em uma coordenada (row, col) na direção especificada
        const canPlace = (grid, word, row, col, dr, dc) => {
            for (let i = 0; i < word.length; i += 1) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r < 0 || c < 0 || r >= currentSize || c >= currentSize) {
                    return false;
                }
                const cell = grid[r][c];
                if (cell && cell !== word[i]) return false;
            }
            return true;
        };

        // Aplica e grava as letras da palavra na matriz na coordenada e direção validadas
        const applyPlace = (grid, word, row, col, dr, dc) => {
            for (let i = 0; i < word.length; i += 1) {
                const r = row + dr * i;
                const c = col + dc * i;
                grid[r][c] = word[i];
            }
        };

        const scorePlacement = (grid, word, row, col, dr, dc) => {
            let intersections = 0;
            let openCells = 0;

            for (let i = 0; i < word.length; i += 1) {
                const r = row + dr * i;
                const c = col + dc * i;
                const cell = grid[r][c];
                if (!cell) openCells += 1;
                else if (cell === word[i]) intersections += 1;
            }

            return { intersections, openCells };
        };

        // Tenta encontrar uma coordenada válida para posicionar uma palavra específica
        const tryPlaceWord = (grid, word, attempts = 500) => {
            const candidates = [];

            for (let i = 0; i < attempts; i += 1) {
                const { dr, dc } = directionPool[Math.floor(Math.random() * directionPool.length)];
                const rowMin = dr === 1 ? 0 : dr === -1 ? word.length - 1 : 0;
                const rowMax = dr === 1 ? currentSize - word.length : dr === -1 ? currentSize - 1 : currentSize - 1;
                const colMin = dc === 1 ? 0 : dc === -1 ? word.length - 1 : 0;
                const colMax = dc === 1 ? currentSize - word.length : dc === -1 ? currentSize - 1 : currentSize - 1;

                if (rowMax < rowMin || colMax < colMin) continue;

                const row = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
                const col = colMin + Math.floor(Math.random() * (colMax - colMin + 1));

                if (!canPlace(grid, word, row, col, dr, dc)) continue;

                const score = scorePlacement(grid, word, row, col, dr, dc);
                candidates.push({ row, col, dr, dc, ...score });
            }

            if (candidates.length === 0) return false;

            candidates.sort((a, b) => {
                if (b.intersections !== a.intersections) return b.intersections - a.intersections;
                if (b.openCells !== a.openCells) return b.openCells - a.openCells;
                return Math.random() - 0.5;
            });

            const best = candidates[0];
            applyPlace(grid, word, best.row, best.col, best.dr, best.dc);
            return true;
        };

        // Loop principal de tentativas de geração do grid completo
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const grid = emptyGrid();
            let allPlaced = true;

            // Tenta posicionar todas as palavras da lista
            for (const word of ordered) {
                if (!tryPlaceWord(grid, word)) {
                    allPlaced = false;
                    break; // Se uma palavra falhar, aborta este grid e tenta um novo
                }
            }

            // Se todas as palavras foram posicionadas com sucesso, preenche os espaços vazios com letras aleatórias
            if (allPlaced) {
                for (let r = 0; r < currentSize; r += 1) {
                    for (let c = 0; c < currentSize; c += 1) {
                        if (!grid[r][c]) {
                            // Gera uma letra maiúscula aleatória entre A (código 65) e Z (65 + 25)
                            grid[r][c] = String.fromCharCode(
                                65 + Math.floor(Math.random() * 26),
                            );
                        }
                    }
                }
                return grid;
            }
        }

        return null;
    };

    // Estratégia de expansão elástica (Fallback): se o grid inicial for pequeno demais para abrigar
    // as palavras, o algoritmo tenta aumentar o tamanho da grade em até 3 unidades (ex: 10x10 -> 11x11 -> 12x12).
    // Quando `allowGrow` for false (ex.: usuário selecionou explicitamente 5x5), não tentamos crescer e
    // retornamos `null` caso não seja possível posicionar as palavras no tamanho pedido.
    if (allowGrow) {
        for (let grow = 0; grow <= 3; grow += 1) {
            const grid = attemptSize(size + grow);
            if (grid) return grid;
        }
    } else {
        // Tenta apenas no tamanho solicitado
        const grid = attemptSize(size);
        if (grid) return grid;
    }

    return null;
}
