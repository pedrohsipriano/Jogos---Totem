import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";
import { normalizeText } from "../../../utils/string";
import { calcularPontos } from "../../../utils/scoring";
import { wholeSeconds } from "../../../utils/time";

// Alfabeto padrão disponível no teclado da forca (inclui o 'Ç' para palavras em português)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÇ".split("");

// Quantidade padrão de vidas caso não seja informada na configuração
const DEFAULT_MAX_LIVES = 5;

/**
 * HOOK DE LÓGICA DO JOGO DA FORCA (useHangmanGameLogic.js)
 * Encapsula o gerenciamento de estado da partida, escolha aleatória de palavras,
 * verificação de acertos/erros, contagem regressiva do tempo e disparo de callbacks globais.
 *
 * @param {Object} props - Propriedades passadas pelo componente visual.
 * @param {Object} props.data - Objeto contendo a lista de palavras (`words`).
 * @param {Object} props.config - Configurações da partida (`timeLimitSeconds`, `maxLives`).
 * @param {Function} props.onScore - Callback acionada ao término do jogo para envio do placar.
 * @param {Function} props.onRoundComplete - Callback acionada em caso de vitória.
 * @param {Function} props.onGameOver - Callback acionada em caso de derrota.
 */
export default function useHangmanGameLogic({
    data = {},
    config = {},
    onScore,
    onRoundComplete,
    onGameOver,
}) {
    const { words = [] } = data;
    const timeLimitSeconds = config.timeLimitSeconds ?? 30;
    const pointsToWin = Math.max(0, Number(config.pointsToWin ?? 50));
    const maxLives = config.maxLives ?? config.maxAttempts ?? DEFAULT_MAX_LIVES;
    const hangmanWordLength = config.hangmanWordLength ?? null;
    const hangmanWordLengthIsMin = !!config.hangmanWordLengthIsMin;

    // ─── DADOS DERIVADOS E FILTRAGEM ─────────────────────────────────────────────

    // Normaliza a lista de palavras garantindo que estejam em maiúsculas, sem strings vazias e aplicando o filtro de tamanho
    const normalizedWords = useMemo(() => {
        const norm = words
            .map((word) => (word ?? "").toUpperCase())
            .filter((word) => word.length > 0);

        if (hangmanWordLength !== null && hangmanWordLength !== undefined) {
            return norm.filter((w) =>
                hangmanWordLengthIsMin ? w.length >= hangmanWordLength : w.length === hangmanWordLength
            );
        }
        return norm;
    }, [words, hangmanWordLength, hangmanWordLengthIsMin]);

    // Flags de estado para diferenciar banco vazio de configuração incompatível
    const hasAnyWords = words.length > 0;
    const noWords = normalizedWords.length === 0 && !hasAnyWords;
    const configurationIssue = normalizedWords.length === 0 && hasAnyWords;
    const playBlocked = noWords || configurationIssue;
    const configurationMessage = configurationIssue
        ? `Não existem palavras com ${hangmanWordLength} letras. Altere a quantidade no Admin.`
        : "";

    // Seleciona aleatoriamente uma palavra da lista normalizada
    const pickRandomWord = useCallback(() => {
        if (normalizedWords.length === 0) return "";
        const idx = Math.floor(Math.random() * normalizedWords.length);
        return normalizedWords[idx];
    }, [normalizedWords]);

    // ─── ESTADOS DA PARTIDA ──────────────────────────────────────────────────────
    const [secret, setSecret] = useState(() => pickRandomWord());     // A palavra secreta atual
    const [guessed, setGuessed] = useState(new Set());                // Set de letras já adivinhadas/clicadas
    const [selectedLetters, setSelectedLetters] = useState([]);       // Histórico das letras já escolhidas
    const [lives, setLives] = useState(maxLives);                     // Contador de vidas restantes
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);       // Cronômetro regressivo em segundos
    const [finished, setFinished] = useState(false);                  // Flag de encerramento da partida
    const [timedOut, setTimedOut] = useState(false);                  // Flag de encerramento por tempo esgotado
    const [reported, setReported] = useState(false);                  // Flag para garantir envio único do placar
    const timeEndRef = useRef(0);

    // ─── MÉTRICAS DERIVADAS ──────────────────────────────────────────────────────

    // Versão da palavra secreta sem acentos para comparação direta com as letras do teclado
    const secretNormalized = useMemo(() => normalizeText(secret), [secret]);

    // String formatada exibida na tela (ex: "C _ S A" para "CASA" com 'C', 'S', 'A' adivinhados)
    const masked = secret
        .split("")
        .map((letter, idx) => (guessed.has(secretNormalized[idx]) ? letter : "_"))
        .join(" ");

    // Condição de vitória: verifica se todas as letras da palavra secreta já estão no Set de palpites
    const won =
        secret.length > 0 &&
        secretNormalized.split("").every((letter) => guessed.has(letter));

    // Quantidade de letras únicas reveladas até o momento
    const revealedCount = secretNormalized
        .split("")
        .filter((letter) => guessed.has(letter)).length;

    // Cálculo da pontuação proporcional ao número de letras reveladas
    const currentPoints = calcularPontos(revealedCount, secret.length || 1);

    // ─── CONTROLE DE FLUXO (RESET E NOVO JOGO) ───────────────────────────────────
    const resetGame = useCallback(() => {
        setSecret(pickRandomWord());
        setGuessed(new Set());
        setSelectedLetters([]);
        setLives(maxLives);
        setTimeLeft(timeLimitSeconds);
        timeEndRef.current = Date.now() + timeLimitSeconds * 1000;
        setFinished(playBlocked); // bloqueia apenas quando não há palavras ou a configuração é inválida
        setTimedOut(false);
        setReported(false);
    }, [pickRandomWord, maxLives, timeLimitSeconds, playBlocked]);

    // Efeito para reiniciar a partida automaticamente se as configurações ou lista de palavras mudarem
    useEffect(() => {
        resetGame();
    }, [resetGame]);

    // ─── CRONÔMETRO REGRESSIVO (TIMER) ───────────────────────────────────────────
    useEffect(() => {
        if (finished || playBlocked || lives <= 0) return undefined;

        if (!timeEndRef.current) {
            timeEndRef.current = Date.now() + timeLimitSeconds * 1000;
        }

        const tick = () => {
            const remainingMs = Math.max(0, timeEndRef.current - Date.now());
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
    }, [finished, playBlocked, lives, timeLimitSeconds]);

    // ─── MONITORAMENTO DE VITÓRIA ────────────────────────────────────────────────
    useEffect(() => {
        if (playBlocked || finished || lives <= 0) return;
        if (won) {
            setFinished(true);
        }
    }, [won, finished, playBlocked, lives]);

    // ─── DISPARO DE CALLBACKS GLOBAIS (PONTUAÇÃO E FIM DE JOGO) ──────────────────
    useEffect(() => {
        if (!finished || reported || playBlocked) return;

        const payload = {
            game: "Forca",
            score: currentPoints,
            points: currentPoints,
            remainingSeconds: wholeSeconds(timeLeft),
            timedOut: timedOut || noWords,
        };

        // Payload sanitizado para callbacks e emissor
        const finalPayload = sanitizeGamePayload(payload);
        const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
        const elapsed = Math.max(0, Math.floor(timeLimitSeconds - timeLeft));
        const totalScore = Math.max(
            0,
            Math.round(Number(payload.score ?? payload.points ?? 0) + (payload.timedOut ? 0 : remaining)),
        );
        const wonByPoints = Number(payload.score ?? payload.points ?? 0) >= pointsToWin;
        const dialogPayload = {
            game: String(payload.game),
            score: totalScore,
            totalScore,
            remainingSeconds: elapsed,
            elapsedSeconds: elapsed,
            timedOut: !!payload.timedOut,
            targetScore: pointsToWin,
            won: wonByPoints,
            correctWord: secret,
        };

        // Dispara a callback de pontuação geral
        onScore?.(finalPayload);

        // Dispara a callback específica de vitória ou derrota
        if (won) {
            onRoundComplete?.(finalPayload);
        } else {
            onGameOver?.(finalPayload);
        }
        // Notifica Dialog central (se presente)
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
        playBlocked,
        won,
    ]);

    // ─── MANIPULADOR DE PALPITE (CLIQUE NA LETRA) ────────────────────────────────
    const pickLetter = useCallback(
        (letter) => {
            const normalizedLetter = normalizeText(letter);
            if (won || guessed.has(normalizedLetter) || finished || playBlocked) return;

            // Adiciona a letra ao Set de palpites
            setGuessed((prev) => new Set(prev).add(normalizedLetter));

            const isCorrect = secretNormalized.includes(normalizedLetter);
            setSelectedLetters((prev) => [
                ...prev,
                { letter: normalizedLetter, correct: isCorrect },
            ]);

            // Se a letra não existir na palavra secreta, desconta uma vida
            if (!isCorrect) {
                setLives((currentLives) => {
                    const nextLives = Math.max(0, currentLives - 1);
                    if (nextLives === 0) {
                        setFinished(true);
                        setTimedOut(false); // Derrota por perda de vidas, não por tempo
                    }
                    return nextLives;
                });
            }
        },
        [won, guessed, finished, playBlocked, secretNormalized],
    );

    // ─── RETORNO DA API PÚBLICA DO HOOK ──────────────────────────────────────────
    return {
        // Constantes
        alphabet: ALPHABET,

        // Estado do jogo
        secret,
        masked,
        guessed,
        selectedLetters,
        lives,
        maxLives,
        timeLeft,
        finished,
        timedOut,
        won,
        noWords,
        configurationIssue,
        configurationMessage,
        playBlocked,

        // Métricas
        revealedCount,
        currentPoints,

        // Ações
        pickLetter,
        resetGame,
    };
}
