import { useCallback, useEffect, useRef, useState } from "react";
import { shuffle } from "../../../utils/array";
import { mulberry32 } from "../../../utils/random";
import { calcularPontos } from "../../../utils/scoring";
import { wholeSeconds } from "../../../utils/time";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";

/**
 * Hook que encapsula toda a lógica do Jogo da Memória.
 *
 * Contrato de entrada:
 *   data     — { symbols: string[] }  conteúdo vindo da API
 *   settings — { timeLimitSeconds, pairCount, seed }  configurações da partida
 *
 * Contrato de saída (callbacks):
 *   onScore(payload)      — disparado quando a partida termina
 *   onRoundComplete()     — disparado quando o jogador completa todos os pares
 *   onGameOver(payload)   — disparado quando o tempo esgota
 */
export default function useMemoryGameLogic({
    data = {},
    config = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    const { symbols = [] } = data;
    const {
        timeLimitSeconds = 30,
        pairCount = null,
        seed = null,
    } = config;
    const pointsToWin = Math.max(0, Number(config.pointsToWin ?? 100));

    const noSymbols = symbols.length === 0;
    const previewTimer = useRef(null);
    const runRef = useRef(0);

    // ─── Construção do baralho ───────────────────────────────────────
    const buildDeck = useCallback(
        (runKey = 0) => {
            const rng =
                seed === null
                    ? Math.random
                    : mulberry32(Number(seed) + Number(runKey));

            const maxPairs = config.pairCount ?? symbols.length;
            const shuffledSymbols = shuffle(symbols, rng);
            const selected = shuffledSymbols.slice(
                0,
                Math.max(0, Math.min(maxPairs, symbols.length)),
            );
            const doubled = selected.flatMap((s) => [s, s]);
            return shuffle(doubled, rng).map((s, index) => ({
                id: `${s.id || s.word}-${index}`,
                label: s.word,
                imageUrl: s.imageUrl,
                matched: false,
            }));
        },
        [symbols, pairCount, seed],
    );

    // ─── Estado ──────────────────────────────────────────────────────
    const [cards, setCards] = useState(() => buildDeck(runRef.current));
    const [flipped, setFlipped] = useState([]);
    const [locked, setLocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
    const [finished, setFinished] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const [reported, setReported] = useState(false);
    const [previewing, setPreviewing] = useState(false);

    // ─── Métricas derivadas ──────────────────────────────────────────
    const matchedPairs = Math.floor(
        cards.filter((c) => c.matched).length / 2,
    );
    const totalPairs = Math.max(1, Math.floor(cards.length / 2));
    const currentPoints = calcularPontos(matchedPairs, totalPairs);
    const solved = cards.length > 0 && cards.every((c) => c.matched);

    // ─── Reset / novo jogo ───────────────────────────────────────────
    const resetGame = useCallback(() => {
        runRef.current += 1;
        setCards(buildDeck(runRef.current));
        setFlipped([]);
        setLocked(false);
        setTimeLeft(timeLimitSeconds);
        setFinished(false);
        setTimedOut(false);
        setReported(false);
        setPreviewing(true);
        if (previewTimer.current) clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => setPreviewing(false), 3200);
    }, [buildDeck, timeLimitSeconds, noSymbols]);

    // Reagir a mudanças nas props de configuração / dados
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // Cleanup do preview timer
    useEffect(
        () => () => {
            if (previewTimer.current) clearTimeout(previewTimer.current);
        },
        [],
    );

    // ─── Timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (finished || noSymbols) return undefined;

        // Usa endTime para calcular tempo restante com precisão (float)
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
        // Atualiza a cada 50ms para centésimos estáveis
        const id = setInterval(tick, 50);
        // Atualiza imediatamente
        tick();
        return () => clearInterval(id);
    }, [finished, noSymbols, timeLimitSeconds]);

    // ─── Detectar vitória ────────────────────────────────────────────
    useEffect(() => {
        if (!solved || finished) return;
        setFinished(true);
    }, [solved, finished]);

    // ─── Reportar pontuação ──────────────────────────────────────────
    useEffect(() => {
        if (!finished || reported) return;

        const payload = {
            game: "Memoria",
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

        finalPayload.score = totalScore;
        finalPayload.points = totalScore;
        finalPayload.totalScore = totalScore;

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
    }, [
        finished,
        reported,
        onScore,
        onRoundComplete,
        onGameOver,
        currentPoints,
        timeLeft,
        timedOut,
    ]);

    // ─── Ação: virar carta ───────────────────────────────────────────
    const handleFlip = useCallback(
        (cardId) => {
            if (locked || finished || noSymbols || previewing) return;
            const card = cards.find((c) => c.id === cardId);
            if (!card || card.matched || flipped.includes(cardId)) return;

            const next = [...flipped, cardId];
            setFlipped(next);

            if (next.length === 2) {
                setLocked(true);
                const [first, second] = next.map((id) =>
                    cards.find((c) => c.id === id),
                );
                // Match by imageUrl if present, otherwise by label
                const isMatch = (first.imageUrl && second.imageUrl)
                    ? first.imageUrl === second.imageUrl
                    : first.label === second.label;
                setTimeout(() => {
                    setCards((prev) =>
                        prev.map((c) =>
                            next.includes(c.id) && isMatch
                                ? { ...c, matched: true }
                                : c,
                        ),
                    );
                    setFlipped([]);
                    setLocked(false);
                }, 450);
            }
        },
        [locked, finished, noSymbols, previewing, cards, flipped],
    );

    // ─── API pública do hook ─────────────────────────────────────────
    return {
        // Estado do jogo
        cards,
        flipped,
        previewing,
        finished,
        timedOut,
        noSymbols,
        timeLeft,

        // Métricas
        matchedPairs,
        totalPairs,
        currentPoints,

        // Ações
        handleFlip,
        resetGame,
    };
}
