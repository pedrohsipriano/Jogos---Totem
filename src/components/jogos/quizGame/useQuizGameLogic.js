import { useCallback, useEffect, useMemo, useState } from "react";
import { shuffle } from "../../../utils/array";
import { wholeSeconds } from "../../../utils/time";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";

/**
 * Calcula pontos do quiz com base apenas nos acertos.
 * @param {number} corretas
 * @param {number} totalPerguntas
 * @returns {number}
 */
const calcularPontosQuiz = (corretas, totalPerguntas) => {
    if (!totalPerguntas || totalPerguntas <= 0) return 0;
    const valorAcerto = 100 / totalPerguntas;
    const bruto = corretas * valorAcerto;
    return Math.max(0, Math.floor(bruto));
};

/**
 * Normaliza uma questão da API para o formato interno.
 * Aceita tanto { question, options, answer } quanto { prompt, options, answer }.
 */
const normalizeQuestion = (q) => {
    if (!q) return null;
    const prompt = q.prompt || q.question || "";
    const answer = q.answer || "";
    let options = null;
    if (Array.isArray(q.options)) {
        options = q.options.map((o) => String(o ?? "").trim()).filter(Boolean);
    } else if (typeof q.options === "string" && q.options.trim().startsWith("[")) {
        try {
            const parsed = JSON.parse(q.options);
            if (Array.isArray(parsed)) {
                options = parsed.map((o) => String(o ?? "").trim()).filter(Boolean);
            }
        } catch (e) {}
    }
    if (!prompt || !answer) return null;
    return { prompt, answer, options };
};

/**
 * Hook que encapsula toda a lógica do Jogo de Quiz.
 *
 * Contrato de entrada:
 *   data     — { questions: Array<{ question|prompt, options, answer }> }
 *   settings — { timeLimitSeconds, questionLimit }
 *
 * Contrato de saída (callbacks):
 *   onScore(payload)      — disparado quando a partida termina
 *   onRoundComplete()     — disparado ao responder todas as perguntas
 *   onGameOver(payload)   — disparado quando o tempo esgota
 */
export default function useQuizGameLogic({
    data = {},
    settings = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    const { questions = [] } = data;
    const {
        timeLimitSeconds = 30,
        questionLimit = null,
    } = settings;
    const pointsToWin = Math.max(0, Number(settings.pointsToWin ?? 100));

    // ─── Dados sanitizados ───────────────────────────────────────────
    const sanitizedQuestions = useMemo(
        () => questions.map(normalizeQuestion).filter(Boolean),
        [questions],
    );

    const noQuestions = sanitizedQuestions.length === 0;

    // Chave para forçar re-shuffle ao resetar
    const [shuffleKey, setShuffleKey] = useState(0);

    // Prepara a lista de questões que serão usadas nesta rodada (embaralha e limita)
    const randomizedQuestions = useMemo(() => {
        const maxQuestions = sanitizedQuestions.length || 0;
        const safeQuestionLimit = Number.isFinite(questionLimit) && questionLimit > 0
            ? Math.min(questionLimit, maxQuestions)
            : maxQuestions;

        let pool = shuffle(sanitizedQuestions);
        pool = pool.slice(0, safeQuestionLimit);

        const allAnswers = [...new Set(sanitizedQuestions.map((q) => q.answer))];

        return pool.map((q) => {
            let finalOptions;
            if (Array.isArray(q.options) && q.options.length >= 2) {
                const uniqueOptions = [...new Set([q.answer, ...q.options])];
                finalOptions = shuffle(uniqueOptions);
            } else {
                // Auto-gerar opções (1 certa + até 3 erradas pegas de outras perguntas)
                const wrongAnswers = allAnswers.filter((ans) => ans !== q.answer);
                const shuffledWrongs = shuffle(wrongAnswers).slice(0, 3);
                finalOptions = shuffle([q.answer, ...shuffledWrongs]);
            }

            return {
                ...q,
                options: finalOptions,
            };
        });
    }, [sanitizedQuestions, questionLimit, shuffleKey]);
    const [step, setStep] = useState(0);
    const [roundCorrect, setRoundCorrect] = useState(0);
    const [finished, setFinished] = useState(noQuestions);
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
    const [timedOut, setTimedOut] = useState(false);
    const [reported, setReported] = useState(false);
    const [answersByStep, setAnswersByStep] = useState({});
    const [isPaused, setIsPaused] = useState(false);
    const [lastSelection, setLastSelection] = useState(null); // { option, isCorrect }

    // ─── Métricas derivadas ──────────────────────────────────────────
    const totalQuestions = randomizedQuestions.length || 1;
    const currentPoints = calcularPontosQuiz(roundCorrect, totalQuestions);
    const currentQuestion = randomizedQuestions[step] ?? null;

    // ─── Reset / novo jogo ───────────────────────────────────────────
    const resetGame = useCallback(() => {
        setStep(0);
        setRoundCorrect(0);
        setFinished(noQuestions);
        setTimeLeft(timeLimitSeconds);
        setTimedOut(false);
        setReported(false);
        setAnswersByStep({});
        setIsPaused(false);
        setLastSelection(null);
        setShuffleKey((k) => k + 1);
    }, [noQuestions, timeLimitSeconds]);

    // Reagir a mudanças nas props de configuração / dados
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // ─── Timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (finished || noQuestions || isPaused) return undefined;

        const endTime = Date.now() + timeLeft * 1000;
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
    }, [finished, noQuestions, isPaused]); // Usar timeLeft como dependência causaria loops, mantemos isPaused


    // ─── Reportar pontuação ──────────────────────────────────────────
    useEffect(() => {
        if (!finished || reported) return;

        const payload = {
            game: "Quiz",
            score: currentPoints,
            points: currentPoints,
            remainingSeconds: wholeSeconds(timeLeft),
            timedOut: timedOut || noQuestions,
        };

        const finalPayload = sanitizeGamePayload(payload);
        const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
        const elapsed = Math.max(0, Math.floor(timeLimitSeconds - timeLeft));
        const totalScore = Math.max(
            0,
            Math.round(Number(payload.score ?? payload.points ?? 0) + (payload.timedOut ? 0 : remaining)),
        );
        const dialogEntries = randomizedQuestions.map((question, index) => {
            const chosen = answersByStep[index] ?? null;

            return {
                prompt: question.prompt,
                answer: question.answer,
                chosen,
                correct: chosen === question.answer,
            };
        });
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

        finalPayload.score = totalScore;
        finalPayload.points = totalScore;
        finalPayload.totalScore = totalScore;

        onScore?.(finalPayload);

        if (timedOut || noQuestions) {
            onGameOver?.(finalPayload);
        } else {
            onRoundComplete?.(finalPayload);
        }

        // Notifica Dialog central
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
        noQuestions,
        randomizedQuestions,
        answersByStep,
    ]);

    // ─── Ação: escolher resposta ─────────────────────────────────────
    const chooseAnswer = useCallback(
        (option) => {
            if (finished || noQuestions || !currentQuestion || isPaused) return;

            setAnswersByStep((prev) => ({ ...prev, [step]: option }));
            const correct = option === currentQuestion.answer;
            if (correct) setRoundCorrect((prev) => prev + 1);

            // Inicia pausa de 1 segundo para o feedback visual
            setIsPaused(true);
            setLastSelection({ option, isCorrect: correct });

            setTimeout(() => {
                setIsPaused(false);
                setLastSelection(null);

                const nextStep = step + 1;
                if (nextStep >= randomizedQuestions.length) {
                    setFinished(true);
                } else {
                    setStep(nextStep);
                }
            }, 1000);
        },
        [finished, noQuestions, currentQuestion, step, randomizedQuestions.length, isPaused],
    );

    // ─── API pública do hook ─────────────────────────────────────────
    return {
        // Estado do jogo
        step,
        currentQuestion,
        randomizedQuestions,
        answersByStep,
        finished,
        timedOut,
        noQuestions,
        timeLeft,
        isPaused,
        lastSelection,

        // Métricas
        roundCorrect,
        currentPoints,
        totalQuestions,

        // Ações
        chooseAnswer,
        resetGame,
    };
}
