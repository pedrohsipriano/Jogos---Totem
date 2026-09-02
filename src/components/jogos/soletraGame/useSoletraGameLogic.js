import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "../../../utils/array";
import { normalizeText } from "../../../utils/string";
import { calcularPontos } from "../../../utils/scoring";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";
import { wholeSeconds } from "../../../utils/time";

// Limite máximo de dicas/letras reveladas permitidas por palavra (padrão: 3)
const MAX_HINTS_PER_WORD = 3;

/**
 * Estrutura de dados de fallback (padrão) utilizada caso a API REST não retorne rodadas cadastradas.
 * Contém um conjunto de letras para a colmeia e três palavras-alvo com suas respectivas dicas explicativas.
 */
const DEFAULT_ROUND_DATA = {
    exemplos: [
        {
            letras: ["L", "O", "G", "I", "S", "T", "A"],
            alvos: [
                {
                    palavra: "LOGISTA",
                    dica: "Profissional que organiza operacoes de transporte e distribuicao.",
                },
                {
                    palavra: "SOLO",
                    dica: "Modo individual de operacao, com foco em uma unica pessoa.",
                },
                {
                    palavra: "SIGLA",
                    dica: "Abreviacao comum em termos tecnicos do varejo.",
                },
            ],
        },
    ],
};

// ─── Funções utilitárias internas ────────────────────────────────

/**
 * Normaliza e ordena alfabeticamente as letras de uma palavra para facilitar comparações de anagramas.
 */
const sortLetters = (word) => normalizeText(word).split("").sort().join("");

/**
 * Constrói o conjunto de 7 letras exclusivas para a colmeia hexagonal.
 * Remove duplicatas e, caso a palavra forneça menos de 7 letras distintas,
 * preenche o restante com caracteres aleatórios do alfabeto.
 *
 * @param {string[]} letters - Array inicial de letras extraídas da palavra-alvo.
 * @returns {string[]} Array contendo exatamente 7 letras distintas embaralhadas.
 */
const buildHoneycomb = (letters) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    // Remove duplicatas
    const unique = Array.from(new Set(letters));

    // Se tiver menos de 7, preenche com letras aleatórias do alfabeto
    while (unique.length < 7) {
        // Pega uma letra aleatória que não esteja na lista
        let randomLetter;
        do {
            randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
        } while (unique.includes(randomLetter));

        unique.push(randomLetter);
    }

    return shuffle(unique.slice(0, 7));
};

/**
 * Normaliza uma rodada raw da API para o formato interno.
 * Aceita tanto { letras, alvos } (formato antigo) quanto
 * { word, hint } (formato do backend Sequelize).
 */
/**
 * Normaliza os dados brutos (raw) de uma rodada da API REST para o formato interno padronizado.
 * Suporta tanto a estrutura legada `{ letras, alvos }` (com múltiplos alvos por colmeia) quanto a
 * estrutura do Sequelize `{ word, hint }` (gerando a colmeia dinamicamente a partir da palavra).
 *
 * @param {Object} rawRound - Objeto representando os dados brutos da rodada.
 * @returns {Array} Lista de alvos normalizados, cada um contendo `{ letters, target }`.
 */
const normalizeRound = (rawRound) => {
    if (!rawRound) return [];

    const normalizedTargets = [];

    // Formato { letras, alvos } (exemplos inline / legado)
    if (rawRound?.letras || rawRound?.alvos) {
        const letters = buildHoneycomb(
            (rawRound?.letras ?? []).map(normalizeText),
        );
        const targets = (rawRound?.alvos ?? [])
            .slice(0, 3)
            .map((item) => ({
                palavra: normalizeText(item.palavra),
                dica: item.dica || "Sem dica cadastrada.",
            }))
            .filter((item) => item.palavra.length > 0);

        for (const target of targets) {
            normalizedTargets.push({ letters, target });
        }

        return normalizedTargets;
    }

    // Formato { word, hint } (vindo do modelo SoletraRound do Sequelize)
    if (rawRound?.word) {
        const word = normalizeText(rawRound.word);
        normalizedTargets.push({
            letters: buildHoneycomb(word.split("")),
            target: {
                palavra: word,
                dica: rawRound.hint || "Sem dica cadastrada.",
            },
        });
    }

    return normalizedTargets;
};

/**
 * Constrói a fila de unidades (palavras-alvo) para a sessão de jogo atual.
 * Aplica o limite configurado de palavras (`wordLimit`) e embaralha a lista para garantir variedade.
 *
 * @param {Object} roundData - Objeto contendo os dados da rodada vindos da API.
 * @param {number} wordLimit - Quantidade máxima de palavras permitidas para a partida.
 * @returns {Array} Fila final embaralhada de unidades de jogo.
 */
const buildUnitQueue = (roundData, wordLimit, isMin = false) => {
    const dbRounds = Array.isArray(roundData?.rounds) ? roundData.rounds : [];
    const examples = dbRounds.length > 0
        ? dbRounds
        : Array.isArray(roundData?.exemplos)
            ? roundData.exemplos
            : DEFAULT_ROUND_DATA.exemplos;

    const allUnits = examples.flatMap((example) => normalizeRound(example));

    if (allUnits.length === 0) return [];

    let safeLimit;
    if (Number.isFinite(wordLimit) && wordLimit > 0) {
        const minVal = Math.min(Math.floor(wordLimit), allUnits.length);
        if (isMin && minVal < allUnits.length) {
            safeLimit = minVal + Math.floor(Math.random() * (allUnits.length - minVal + 1));
        } else {
            safeLimit = minVal;
        }
    } else {
        safeLimit = Math.min(3, allUnits.length);
    }

    return shuffle(allUnits).slice(0, safeLimit);
};

/**
 * Inicializa o array de contagem de dicas (nível 0) para cada palavra da rodada.
 */
const buildHintLevels = (count) => Array.from({ length: count }, () => 0);

/**
 * Constrói a representação mascarada de uma palavra com base no seu nível atual de dica.
 * Revela as primeiras `hintLevel` letras e substitui o restante por underlines (`_`).
 *
 * @param {string} word - Palavra-alvo completa.
 * @param {number} hintLevel - Quantidade de letras a serem reveladas.
 * @returns {string} String formatada com a máscara (ex: "LO_____").
 */
const buildMaskedWord = (word, hintLevel) => {
    const revealed = Math.min(Math.max(hintLevel, 0), MAX_HINTS_PER_WORD);
    const prefix = word.slice(0, revealed);
    const suffix = "_".repeat(Math.max(0, word.length - revealed));
    return `${prefix}${suffix}`;
};

/**
 * Compara a palavra digitada pelo usuário contra o alvo atual e retorna um array de classes de cor
 * (estilo Wordle/Termo) indicando o status de cada letra: `correct` (posição exata), `exists` (posição incorreta) ou `wrong`.
 *
 * @param {string} userWord - Palavra fornecida pelo jogador.
 * @param {string} targetWord - Palavra-alvo correta.
 * @returns {string[]} Array contendo as classes CSS correspondentes para cada caractere.
 */
const getLetterColors = (userWord, targetWord) => {
    const normalized = normalizeText(userWord);
    const colors = [];

    for (let i = 0; i < normalized.length; i++) {
        const letter = normalized[i];
        const isCorrectPosition = targetWord[i] === letter;
        const exists = targetWord.includes(letter);

        if (isCorrectPosition) {
            colors.push("correct");
        } else if (exists) {
            colors.push("exists");
        } else {
            colors.push("wrong");
        }
    }

    return colors;
};

/**
 * Hook que encapsula toda a lógica do Jogo Soletra.
 *
 * Contrato de entrada:
 *   data     — { roundData: { exemplos: [...] } }  conteúdo vindo da API
 *   settings — { timeLimitSeconds }  configurações da partida
 *
 * Contrato de saída (callbacks):
 *   onScore(payload)      — disparado quando a partida termina
 *   onRoundComplete()     — disparado ao encontrar todas as palavras
 *   onGameOver(payload)   — disparado quando o tempo esgota
 */
export default function useSoletraGameLogic({
    data = {},
    settings = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    const { roundData = DEFAULT_ROUND_DATA } = data;
    const timeLimitSeconds = settings.timeLimitSeconds ?? 30;
    const pointsToWin = Math.max(0, Number(settings.pointsToWin ?? 50));
    const wordLimit = settings.soletraWordLimit ?? settings.wordLimit ?? 3;
    const wordLimitIsMin = !!settings.soletraWordLimitIsMin;

    // ─── ESTADO DA SEQUÊNCIA DE PALAVRAS ─────────────────────────────
    const [sessionUnits, setSessionUnits] = useState(() =>
        buildUnitQueue(roundData, wordLimit, wordLimitIsMin),
    );
    const [currentUnitIndex, setCurrentUnitIndex] = useState(0); // Índice do alvo ativo atual
    const [completedUnits, setCompletedUnits] = useState(0);     // Contagem de palavras adivinhadas

    const activeUnit = sessionUnits[currentUnitIndex] ?? null;
    const letterPool = activeUnit?.letters ?? buildHoneycomb([]);
    const targets = activeUnit ? [activeUnit.target] : [];

    // Mapeia cada palavra da sessão para o seu respectivo índice para validação em tempo O(1)
    const targetByWord = useMemo(
        () => new Map(sessionUnits.map((unit, idx) => [unit.target.palavra, idx])),
        [sessionUnits],
    );

    // ─── Estado do jogo ──────────────────────────────────────────────
    const [typed, setTyped] = useState("");
    const [foundIndexes, setFoundIndexes] = useState(new Set());
    const [hintLevels, setHintLevels] = useState([]);
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
    const [finished, setFinished] = useState(sessionUnits.length === 0);
    const [timedOut, setTimedOut] = useState(false);
    const [reported, setReported] = useState(false);
    const reportQueuedRef = useRef(false);
    const [feedback, setFeedback] = useState("");
    const [lastAttemptColors, setLastAttemptColors] = useState(null);

    // ─── Métricas derivadas ──────────────────────────────────────────
    const currentTargetIndex = currentUnitIndex;

    const currentTarget = activeUnit?.target ?? null;

    const currentPoints = calcularPontos(
        foundIndexes.size,
        sessionUnits.length || 1,
    );

    const honeycomb = letterPool;
    const activeWordLength = currentTarget?.palavra.length ?? 7;
    const typedChars = typed.split("");

    // ─── Reset / novo jogo ───────────────────────────────────────────
    const resetUnitState = useCallback(() => {
        setTyped("");
        setLastAttemptColors(null);
    }, []);

    const resetGame = useCallback(() => {
        const nextUnits = buildUnitQueue(roundData, wordLimit, wordLimitIsMin);
        setSessionUnits(nextUnits);
        setCurrentUnitIndex(0);
        setCompletedUnits(0);
        setTyped("");
        setFoundIndexes(new Set());
        setHintLevels(buildHintLevels(nextUnits.length));
        setTimeLeft(timeLimitSeconds);
        setFinished(nextUnits.length === 0);
        setTimedOut(false);
        setReported(false);
        reportQueuedRef.current = false;
        setFeedback("");
        setLastAttemptColors(null);
    }, [roundData, timeLimitSeconds, wordLimit]);

    // Reagir a mudanças nas props de configuração / dados
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // Sincronizar o tamanho de hintLevels com sessionUnits
    useEffect(() => {
        if (sessionUnits.length > 0) {
            setHintLevels(buildHintLevels(sessionUnits.length));
        }
    }, [sessionUnits.length]);

    const advanceToNextUnit = useCallback(() => {
        setCurrentUnitIndex((prev) => prev + 1);
        resetUnitState();
    }, [resetUnitState]);

    // ─── Timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (finished || sessionUnits.length === 0) return undefined;

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
    }, [finished, sessionUnits.length, timeLimitSeconds]);


    // ─── Reportar pontuação ──────────────────────────────────────────
    useEffect(() => {
        if (!finished || reported || reportQueuedRef.current) return;

        reportQueuedRef.current = true;

        const payload = {
            game: "Soletra",
            score: currentPoints,
            points: currentPoints,
            remainingSeconds: wholeSeconds(timeLeft),
            timedOut,
        };

        const finalPayload = sanitizeGamePayload(payload);
        const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
        const elapsed = Math.max(0, Math.floor(timeLimitSeconds - timeLeft));
        const totalScore = Math.max(
            0,
            Math.round(Number(payload.score ?? payload.points ?? 0) + (payload.timedOut ? 0 : remaining)),
        );
        const dialogEntries = sessionUnits.map((unit, index) => ({
            word: unit.target.palavra,
            hint: unit.target.dica,
            solved: foundIndexes.has(index),
        }));
        const dialogPayload = {
            game: String(payload.game),
            score: totalScore,
            totalScore,
            remainingSeconds: elapsed,
            elapsedSeconds: elapsed,
            timedOut: !!payload.timedOut,
            targetScore: pointsToWin,
            won: Number(payload.score ?? payload.points ?? 0) >= pointsToWin,
            dialogEntries,
        };

        onScore?.(finalPayload);

        const emitGameEnd = () => {
            // Notifica Dialog central (payload sanitizado)
            import("../../Dialog/gameEndReporter")
                .then((m) => {
                    if (m.reportGameEnd) {
                        m.reportGameEnd(dialogPayload);
                    }
                })
                .catch(() => { });

            if (timedOut) {
                onGameOver?.(finalPayload);
            } else {
                onRoundComplete?.(finalPayload);
            }

            setReported(true);
        };

        if (timedOut) {
            window.setTimeout(emitGameEnd, 5000);
            return undefined;
        }

        window.setTimeout(emitGameEnd, 2000);
        return undefined;
    }, [
        finished,
        reported,
        onScore,
        onRoundComplete,
        onGameOver,
        currentPoints,
        timeLeft,
        timedOut,
        sessionUnits,
        foundIndexes,
    ]);

    // ─── AÇÕES DE MANIPULAÇÃO DE ENTRADA ─────────────────────────────

    /**
     * Adiciona uma letra selecionada na colmeia à string digitada atual.
     */
    const pushLetter = useCallback(
        (letter) => {
            if (finished) return;
            setTyped((prev) => `${prev}${letter}`);
            setFeedback("");
            setLastAttemptColors(null);
        },
        [finished],
    );

    /**
     * Remove o último caractere da string digitada atual (Backspace).
     */
    const backspace = useCallback(() => {
        if (finished) return;
        setTyped("");
        setFeedback("");
        setLastAttemptColors(null);
    }, [finished]);

    /**
     * Solicita uma dica para a palavra especificada, incrementando seu nível de revelação.
     * Impede o uso de dicas caso a palavra já esteja resolvida, o limite de dicas tenha sido atingido
     * ou a palavra anterior ainda não tenha sido solucionada.
     */
    const useHint = useCallback(
        (index) => {
            if (finished) return;
            if (foundIndexes.has(index)) return;
            if (hintLevels[index] >= MAX_HINTS_PER_WORD) return;
            if (index > 0 && !foundIndexes.has(index - 1)) return; // Exige ordem sequencial de resolução

            setHintLevels((prev) => {
                const next = [...prev];
                next[index] = Math.min(MAX_HINTS_PER_WORD, next[index] + 1);
                return next;
            });
        },
        [finished, foundIndexes, hintLevels],
    );

    /**
     * VALIDAÇÃO DE PALAVRA (confirmWord)
     * Verifica se a string digitada corresponde à palavra-alvo ativa. Realiza validações de preenchimento,
     * checagem de caracteres permitidos (apenas da colmeia), verifica se a palavra já foi encontrada
     * ou se pertence a um alvo futuro. Fornece feedback visual e textual em cada cenário.
     */
    const confirmWord = useCallback(() => {
        if (finished) return;
        const word = normalizeText(typed);
        if (!word) {
            setFeedback("Digite uma palavra antes de enviar.");
            return;
        }

        // Verifica se todas as letras utilizadas estão presentes na colmeia atual
        const isAllowedChars = word
            .split("")
            .every((letter) => letterPool.includes(letter));

        if (!isAllowedChars) {
            setFeedback("A palavra usa letra que nao esta na colmeia.");
            setLastAttemptColors(null);
            return;
        }

        if (!currentTarget) {
            setFeedback("Nenhuma palavra ativa para validar.");
            setLastAttemptColors(null);
            return;
        }

        const matchedIndex = targetByWord.get(word);
        // A palavra existe no banco de dados da rodada
        if (matchedIndex !== undefined) {
            if (foundIndexes.has(matchedIndex)) {
                setFeedback("Essa palavra ja foi encontrada.");
                setLastAttemptColors(null);
                return;
            }

            // A palavra adivinhada pertence a um índice futuro (bloqueado)
            if (matchedIndex !== currentTargetIndex) {
                setFeedback("Resolva a palavra atual antes da proxima.");
                setLastAttemptColors(
                    getLetterColors(word, currentTarget.palavra),
                );
                return;
            }

            // Sucesso na resolução do alvo atual
            setFeedback("Acertou!");
            setFoundIndexes((prev) => new Set([...prev, matchedIndex]));

            const nextUnitIndex = currentUnitIndex + 1;
            const hasNextUnit = nextUnitIndex < sessionUnits.length;

            // Avança para o próximo alvo ou encerra a partida com vitória
            if (hasNextUnit) {
                advanceToNextUnit();
            } else {
                setFinished(true);
            }
            return;
        }

        // Palavra incorreta: gera as cores de feedback (Wordle/Termo)
        const colors = getLetterColors(word, currentTarget.palavra);
        setLastAttemptColors(colors);

        // Verifica se é um anagrama (mesmas letras, ordem errada)
        const wrongOrder =
            sortLetters(currentTarget.palavra) === sortLetters(word);
        if (wrongOrder) {
            setFeedback(
                "Letras validas, mas a ordem da palavra esta incorreta.",
            );
        } else {
            setFeedback("Palavra nao corresponde ao alvo atual.");
        }
    }, [
        finished,
        typed,
        letterPool,
        currentTarget,
        targetByWord,
        foundIndexes,
        currentTargetIndex,
        currentUnitIndex,
        sessionUnits.length,
        advanceToNextUnit,
    ]);

    // Auto-envio da palavra assim que todas as letras forem preenchidas
    useEffect(() => {
        if (!finished && typed.length === activeWordLength && activeWordLength > 0) {
            confirmWord();
        }
    }, [typed, activeWordLength, finished, confirmWord]);

    // ─── API pública do hook ─────────────────────────────────────────
    return {
        // Constantes
        MAX_HINTS_PER_WORD,

        // Estado da sequência (para renderizar todas as palavras)
        sessionUnits,
        currentUnitIndex,

        // Estado do jogo
        targets,
        honeycomb,
        typed,
        typedChars,
        foundIndexes,
        hintLevels,
        totalWords: sessionUnits.length,
        currentTargetIndex,
        currentTarget,
        activeWordLength,
        timeLeft,
        finished,
        timedOut,
        feedback,
        lastAttemptColors,

        // Métricas
        currentPoints,

        // Ações
        pushLetter,
        backspace,
        useHint,
        confirmWord,
        resetGame,

        // Utilitários para a view
        buildMaskedWord,
    };
}
