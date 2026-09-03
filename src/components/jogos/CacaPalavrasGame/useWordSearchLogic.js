import { useCallback, useEffect, useMemo, useState } from "react";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";
import { generateGrid } from "../../../utils/grid";
import { calcularPontos } from "../../../utils/scoring";
import { wholeSeconds } from "../../../utils/time";

/**
 * CUSTOM HOOK DE LÓGICA DO JOGO CAÇA-PALAVRAS (useWordSearchLogic.js)
 *
 * Encapsula todo o gerenciamento de estado, processamento de strings e regras de negócio do Caça-palavras.
 * Realiza a normalização e filtragem das palavras fornecidas pela API, calcula o tamanho ideal da grade,
 * aciona o gerador de matriz (`generateGrid`), controla o estado interativo de seleção de células por arraste
 * (garantindo seleções estritamente retilíneas em direções ortogonais ou diagonais), gerencia o cronômetro
 * e calcula a pontuação final da partida.
 *
 * @param {Object} props - Propriedades de configuração e callbacks.
 * @param {Object} props.data - Dados brutos da rodada contendo a lista de palavras (`data.words`).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`, `gridSize`, `maxAttempts`, `maxWords`).
 * @param {Function} props.onScore - Callback disparada ao finalizar a partida para registrar a pontuação.
 * @param {Function} props.onRoundComplete - Callback disparada ao encontrar todas as palavras com sucesso.
 * @param {Function} props.onGameOver - Callback disparada ao esgotar o tempo ou falhar na geração da grade.
 */
export default function useWordSearchLogic({
    data = {},
    settings = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    // Desestrutura os dados e configurações com valores de fallback padrão
    const { words = [] } = data;
    const timeLimitSeconds = settings.timeLimitSeconds ?? 30;
    const gridSize = settings.gridSize ?? null;
    const maxAttempts = settings.maxAttempts ?? 50;
    const maxWords = settings.wordLimit ?? settings.maxWords ?? null;
    const wordLimitIsMin = !!settings.wordLimitIsMin;

    // ─── PROCESSAMENTO E NORMALIZAÇÃO DE PALAVRAS ────────────────────
    // Remove acentos (diacríticos), caracteres especiais e converte tudo para maiúsculas
    const upperWords = useMemo(
        () => words
            .map((word) =>
                String(word ?? "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z]/g, "") // Mantém exclusivamente letras de A a Z
                    .toUpperCase()
            )
            .filter((w) => w.length > 0),
        [words],
    );

    // Calcula dinamicamente o tamanho da grade (mínimo 10x10) garantindo espaço suficiente para a maior palavra da lista
    const computedSize = useMemo(() => {
        // If caller explicitly provided a gridSize, respect it (coerce to Number).
        if (gridSize != null) {
            const n = Number(gridSize);
            if (Number.isFinite(n) && n > 0) return n;
        }

        if (upperWords.length === 0) return 10;
        const longest = upperWords.reduce(
            (acc, word) => Math.max(acc, word.length),
            0,
        );
        return Math.max(10, longest + 2);
    }, [upperWords, gridSize]);

    // Filtra palavras que cabem na grade calculada, embaralha a lista e aplica o limite máximo configurado (maxWords)
    const wordsFitting = useMemo(() => {
        const fitting = upperWords.filter((word) => word.length <= computedSize);
        const shuffled = [...fitting].sort(() => Math.random() - 0.5);
        const unique = [...new Set(shuffled)]; // Remove eventuais duplicatas
        if (maxWords) {
            const minVal = Math.min(maxWords, unique.length);
            if (wordLimitIsMin && minVal < unique.length) {
                const randomLimit = minVal + Math.floor(Math.random() * (unique.length - minVal + 1));
                return unique.slice(0, randomLimit);
            }
            return unique.slice(0, maxWords);
        }
        return unique;
    }, [upperWords, computedSize, maxWords, wordLimitIsMin]);

    const noWords = wordsFitting.length === 0;
    const pointsToWin = Math.max(0, Number(settings.pointsToWin ?? 50));

    // Chave auxiliar para forçar a remontagem interna do gerador caso necessário
    const [generationKey, setGenerationKey] = useState(0);

    // ─── ESTADOS DO JOGO E DA GRADE ──────────────────────────────────
    const [grid, setGrid] = useState(() =>
        noWords
            ? null
            : generateGrid(wordsFitting, computedSize, maxAttempts, gridSize == null),
    );
    const [selecting, setSelecting] = useState(false);        // Flag indicando se um arraste de seleção está em andamento
    const [selected, setSelected] = useState([]);             // Array de coordenadas `{ row, col }` atualmente selecionadas
    const [direction, setDirection] = useState(null);         // Vetor de direção da seleção atual `{ dr, dc }` (horizontal, vertical ou diagonal)
    const [found, setFound] = useState(new Set());            // Conjunto (Set) de palavras já encontradas pelo jogador
    const [foundCells, setFoundCells] = useState(new Set());  // Conjunto de chaves `"row-col"` das células que compõem as palavras achadas
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds); // Tempo restante no cronômetro regressivo
    const [finished, setFinished] = useState(noWords);        // Flag indicando se a partida foi encerrada (vitória ou derrota)
    const [timedOut, setTimedOut] = useState(false);          // Flag indicando encerramento por esgotamento do tempo
    const [reported, setReported] = useState(false);          // Flag para evitar múltiplos envios de pontuação
    const [generationFailed, setGenerationFailed] = useState(
        !noWords && grid === null, // Identifica falha no algoritmo de posicionamento das palavras na grade
    );

    // ─── RESET / NOVO JOGO ───────────────────────────────────────────
    /**
     * Reinicia todos os estados da partida, gerando uma nova matriz embaralhada de letras.
     */
    const resetGame = useCallback(() => {
        const newGrid = noWords
            ? null
            : generateGrid(wordsFitting, computedSize, maxAttempts, gridSize == null);
        setGenerationFailed(!noWords && newGrid === null);
        setGrid(newGrid);
        setSelecting(false);
        setSelected([]);
        setDirection(null);
        setFound(new Set());
        setFoundCells(new Set());
        setTimeLeft(timeLimitSeconds);
        setFinished(noWords || newGrid === null);
        setTimedOut(false);
        setReported(false);
        setGenerationKey((k) => k + 1);
    }, [noWords, wordsFitting, computedSize, maxAttempts, timeLimitSeconds]);

    // Inicializa ou reinicia automaticamente a partida sempre que a lista de palavras mudar
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // ─── GESTÃO DO CRONÔMETRO REGRESSIVO (com centésimos) ─────────────
    useEffect(() => {
        if (finished || noWords || generationFailed) return undefined;

        const endTime = Date.now() + timeLimitSeconds * 1000;
        const tick = () => {
            const remainingMs = Math.max(0, endTime - Date.now());
            const remainingSec = remainingMs / 1000;
            setTimeLeft(remainingSec);
            if (remainingMs <= 0) {
                setTimedOut(true);
                setFinished(true);
            }
        };
        const id = setInterval(tick, 50);
        tick();
        return () => clearInterval(id);
    }, [finished, noWords, generationFailed, timeLimitSeconds]);

    // ─── VERIFICAÇÃO DE VITÓRIA (Todas as palavras adivinhadas) ──────
    useEffect(() => {
        if (finished || noWords || generationFailed) return;
        if (found.size === wordsFitting.length && wordsFitting.length > 0) {
            setFinished(true); // Encerra o jogo com vitória assim que o Set de achadas igualar o total de palavras
        }
    }, [finished, found, wordsFitting.length, noWords, generationFailed]);

    const totalWords = wordsFitting.length || 1;
    const currentPoints = calcularPontos(found.size, totalWords);

    // ─── REGISTRO E ENVIO DA PONTUAÇÃO FINAL ─────────────────────────
    useEffect(() => {
        if (!finished || reported) return;

        const isTimeoutOrFailed = timedOut || noWords || generationFailed;

        const payload = {
            game: "Caça-palavras",
            score: currentPoints,
            points: currentPoints,
            remainingSeconds: timedOut ? 0 : wholeSeconds(timeLeft),
            timedOut: isTimeoutOrFailed,
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
        };

        onScore?.(finalPayload);

        if (isTimeoutOrFailed) {
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
    }, [
        finished,
        reported,
        onScore,
        onRoundComplete,
        onGameOver,
        currentPoints,
        timeLeft,
        timedOut,
        noWords,
        generationFailed,
    ]);

    // ─── PROCESSAMENTO DE ARRASTE E SELEÇÃO DE CÉLULAS ───────────────

    /**
     * Inicia o processo de seleção (clique ou toque inicial) em uma célula da grade.
     */
    const beginSelect = useCallback(
        (row, col) => {
            if (finished || noWords || generationFailed) return;
            setSelecting(true);
            setSelected([{ row, col }]);
            setDirection(null); // Zera a direção para permitir que o próximo movimento defina o vetor
        },
        [finished, noWords, generationFailed],
    );

    /**
     * Expande a seleção em andamento conforme o cursor ou dedo se move sobre novas células.
     * Valida se o movimento forma uma linha reta perfeita (horizontal, vertical ou diagonal)
     * e impede seleções em zigue-zague.
     */
    const extendSelect = useCallback(
        (row, col) => {
            if (!selecting || finished || noWords || generationFailed) return;
            const start = selected[0];
            if (!start) return;

            const dr = row - start.row;
            const dc = col - start.col;

            // Valida se a célula atual está alinhada em linha reta (horizontal, vertical ou diagonal) com a inicial
            const isStraight =
                dr === 0 || // Horizontal
                dc === 0 || // Vertical
                Math.abs(dr) === Math.abs(dc); // Diagonal

            if (!isStraight) return;

            const stepR = dr === 0 ? 0 : Math.sign(dr);
            const stepC = dc === 0 ? 0 : Math.sign(dc);
            const steps = Math.max(Math.abs(dr), Math.abs(dc));

            const newSelected = [];
            for (let i = 0; i <= steps; i += 1) {
                newSelected.push({
                    row: start.row + i * stepR,
                    col: start.col + i * stepC,
                });
            }

            setSelected(newSelected);
        },
        [selecting, finished, noWords, generationFailed, selected],
    );

    /**
     * Finaliza a seleção ao soltar o clique ou toque (onPointerUp).
     * Extrai a string formada pelas células selecionadas e verifica se corresponde a alguma
     * palavra-alvo ativa (tanto no sentido direto quanto no inverso).
     */
    const finishSelect = useCallback(() => {
        if (!selecting || finished || noWords || generationFailed) return;

        // Constrói a string a partir das coordenadas selecionadas
        const letters = selected.map((cell) => grid[cell.row][cell.col]).join("");
        const reverse = letters.split("").reverse().join(""); // Permite adivinhar palavras de trás para frente
        const matchWord = wordsFitting.find(
            (word) => word === letters || word === reverse,
        );

        // Se encontrou uma palavra válida que ainda não havia sido achada
        if (matchWord && !found.has(matchWord)) {
            const nextFound = new Set(found);
            nextFound.add(matchWord);
            setFound(nextFound);

            // Adiciona todas as coordenadas da palavra ao Set de células encontradas (para destaque verde permanente)
            const nextCells = new Set(foundCells);
            selected.forEach((cell) => nextCells.add(`${cell.row}-${cell.col}`));
            setFoundCells(nextCells);
        }

        // Zera o estado de seleção para a próxima tentativa
        setSelecting(false);
        setSelected([]);
        setDirection(null);
    }, [
        selecting,
        finished,
        noWords,
        generationFailed,
        selected,
        grid,
        wordsFitting,
        found,
        foundCells,
    ]);

    /**
     * Verifica se uma célula específica está atualmente destacada no arraste de seleção.
     */
    const isSelected = useCallback(
        (row, col) =>
            selected.some((cell) => cell.row === row && cell.col === col),
        [selected],
    );

    /**
     * Verifica se uma célula específica faz parte de alguma palavra já encontrada.
     */
    const isFound = useCallback(
        (row, col) => foundCells.has(`${row}-${col}`),
        [foundCells],
    );

    // Retorna a API pública do Custom Hook para consumo da View
    return {
        // Estado da grade
        grid,
        gridCols: grid?.[0]?.length ?? computedSize,

        // Estado interativo de seleção
        selecting,
        selected,
        isSelected,
        isFound,

        // Estado das palavras
        wordsFitting,
        found,

        // Estado do cronômetro e da partida
        timeLeft,
        finished,
        timedOut,
        noWords,
        generationFailed,

        // Métricas e pontuação
        currentPoints,
        totalWords,

        // Funções de manipulação (Handlers)
        beginSelect,
        extendSelect,
        finishSelect,
        resetGame,
    };
}
