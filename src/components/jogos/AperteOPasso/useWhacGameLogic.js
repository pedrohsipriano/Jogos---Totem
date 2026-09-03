import { useCallback, useEffect, useRef, useState } from "react";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";

// ─── CONFIGURAÇÕES E CONSTANTES GLOBAIS DO JOGO ──────────────────────────
const GRID_SIZE = 12; // Quantidade padrão de slots/buracos na grade do jogo
const ICONS_TARGET = ["OMNI"]; // Ícone que representa o alvo válido (Logo OmniVarejo)
const ICONS_DECOY = ["DECOY_X", "DECOY_DOWN", "DECOY_WARN", "DECOY_ALERT"];  // Distratores (renderizados via SVG sem emojis)
const MIN_ITEM_TIME = 1400; // Duração mínima que um item permanece ativo no slot (em ms - aumentado para fácil visualização)
const MAX_ITEM_TIME = 2400; // Duração máxima que um item permanece ativo no slot (em ms)
const MAX_ACTIVE_ITEMS = 4; // Número máximo de itens simultâneos na tela
const SPAWN_INTERVAL = 450; // Intervalo entre spawns de novos itens (em ms)

// ── Cotas fixas base (referência: 30 segundos) ────────────────────
// Targets escalam proporcionalmente ao tempo de partida (base: 50 alvos em 30s); decoys são infinitos.
const BASE_TIME_SECONDS = 30;
const BASE_TARGET_COUNT = 50;

/**
 * Calcula a cota total de alvos (targets) que devem aparecer durante a partida,
 * escalando proporcionalmente ao tempo configurado (ex: 30s → 50 alvos, 60s → 100 alvos).
 *
 * @param {number} timeLimitSeconds - Duração total da partida em segundos.
 * @returns {number} Quantidade total planejada de alvos.
 */
const computeTargetQuota = (timeLimitSeconds) => {
    const scale = Math.max(0, timeLimitSeconds) / BASE_TIME_SECONDS;
    return Math.max(1, Math.round(BASE_TARGET_COUNT * scale));
};

const toFiniteNumber = (value, fallback) => {
    const parsed = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * CUSTOM HOOK DE LÓGICA DO JOGO WHAC-A-MOLE / OMNI-CATCH (useWhacGameLogic.js)
 *
 * Gerencia o ciclo de vida completo do minijogo de acerto rápido. Controla o surgimento (spawn)
 * contínuo e aleatório de itens (alvos válidos e distratores falsos) em uma grade de slots,
 * calcula durações individuais de permanência, processa cliques do jogador, gerencia o cronômetro
 * e calcula a pontuação final baseada no percentual de acertos da cota planejada.
 *
 * IMPORTANTE PARA PERFORMANCE E COMPATIBILIDADE COM REACT STRICT MODE:
 * Toda a mutação de referências de contagem (`scoreRef`, `targetsHitRef`, `targetQuotaRef`) é realizada
 * por meio de `useRef` e executada fora das funções de atualização de estado (`setActiveSlots`) para evitar
 * dupla contagem ou inconsistências causadas pelas renderizações extras do StrictMode.
 *
 * @param {Object} props - Propriedades de configuração e callbacks.
 * @param {Object} props.data - Dados auxiliares da rodada (opcional).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`, `gridSize`).
 * @param {Function} props.onScore - Callback disparada para registrar a pontuação final ao término.
 * @param {Function} props.onGameOver - Callback disparada ao encerrar a partida.
 */
export default function useWhacGameLogic({
    data = {},
    settings = {},
    onScore,
    onGameOver,
}) {
    // Configurações iniciais com valores padrão de fallback
    const timeLimitSeconds = Math.max(
        1,
        toFiniteNumber(settings.timeLimitSeconds, 30),
    );
    const pointsToWin = Math.max(0, Number(settings.pointsToWin ?? 100));
    const gridSize = Math.max(1, Math.floor(toFiniteNumber(settings.gridSize, GRID_SIZE)));

    // ─── ESTADOS REATIVOS DO JOGO (Para renderização na View) ────────
    const [finalScore, setFinalScore] = useState(null);       // Pontuação final calculada (0 a 100)
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds); // Tempo restante no cronômetro
    const [gameActive, setGameActive] = useState(false);      // Flag indicando se o loop do jogo está rodando
    const [gameStarted, setGameStarted] = useState(false);    // Flag indicando se a partida já saiu da tela inicial
    const [finished, setFinished] = useState(false);          // Flag indicando encerramento da partida
    const [reported, setReported] = useState(false);          // Flag para evitar múltiplos envios da pontuação

    // ─── ALVO ESCOLHIDO PARA A PARTIDA ───────────────────────────────
    // Seleciona aleatoriamente um ícone da lista de alvos válidos para ser o objetivo fixo do jogador
    const [targetIcon, setTargetIcon] = useState(() =>
        ICONS_TARGET[Math.floor(Math.random() * ICONS_TARGET.length)],
    );

    // ─── LISTA DE ITENS ATIVOS NOS SLOTS ─────────────────────────────
    const [activeSlots, setActiveSlots] = useState([]);

    // ─── CONTROLE DE FEEDBACK VISUAL (Cliques validados) ─────────────
    // Armazena os IDs dos itens clicados para aplicar a classe CSS de flash verde temporário
    const [clickedIds, setClickedIds] = useState(new Set());

    // ─── REFERÊNCIAS MUTÁVEIS (useRef para alta performance) ─────────
    const spawnLoopRef = useRef(null);       // Referência do setInterval do loop de spawn
    const countdownRef = useRef(null);       // Referência do setInterval do cronômetro regressivo
    const hideTimersRef = useRef(new Map()); // Mapa de temporizadores (setTimeout) para remoção automática de cada item
    const scoreRef = useRef(0);              // Pontuação bruta acumulada
    const targetsHitRef = useRef(0);         // Contagem de alvos legítimos acertados pelo jogador
    const targetsAppearedRef = useRef(0);    // Contagem total de alvos que já surgiram na grade
    const wrongClicksRef = useRef(0);        // Contagem de cliques incorretos (em distratores)
    const timeLeftRef = useRef(timeLimitSeconds); // Espelho mutável do tempo restante
    const endTimeRef = useRef(null);
    const isGameRunningRef = useRef(false);  // Flag de execução para controle interno do loop
    const nextItemIdRef = useRef(1);         // Gerador de IDs únicos para cada item que surge na grade

    // Ref espelho da lista de slots ativos (garante acesso instantâneo e limpo dentro de temporizadores)
    const activeSlotsRef = useRef([]);

    // Ref da cota restante de alvos (distratores não consomem cota e surgem infinitamente)
    const targetQuotaRef = useRef(0);

    // Buffer de tolerância de clique: permite validar o acerto caso o dedo toque até 450ms após expirar
    const recentlyRemovedRef = useRef(new Map());

    /**
     * Gera um tempo de permanência aleatório para um item, respeitando os limites mínimo e máximo.
     */
    const getRandomItemTime = useCallback(() => {
        return MIN_ITEM_TIME + Math.floor(Math.random() * (MAX_ITEM_TIME - MIN_ITEM_TIME + 1));
    }, []);

    /**
     * Seleciona aleatoriamente o índice de um slot que esteja atualmente vazio.
     *
     * @param {Array} currentSlots - Lista atual de itens ativos.
     * @returns {number|null} Índice do slot livre ou null caso a grade esteja cheia.
     */
    const pickFreeSlot = useCallback((currentSlots) => {
        const occupied = new Set(currentSlots.map((slot) => slot.index));
        const freeSlots = Array.from({ length: gridSize }, (_, i) => i).filter(
            (i) => !occupied.has(i),
        );
        if (freeSlots.length === 0) return null;
        return freeSlots[Math.floor(Math.random() * freeSlots.length)];
    }, [gridSize]);

    /**
     * Cancela e limpa o temporizador de remoção automática de um item específico.
     */
    const clearHideTimer = useCallback((itemId) => {
        const timerId = hideTimersRef.current.get(itemId);
        if (timerId) {
            clearTimeout(timerId);
            hideTimersRef.current.delete(itemId);
        }
    }, []);

    /**
     * Agenda a remoção automática de um item do slot após o término da sua duração calculada.
     */
    const scheduleItemRemoval = useCallback(
        (item) => {
            clearHideTimer(item.id);
            const timerId = setTimeout(() => {
                recentlyRemovedRef.current.set(item.index, { ...item, removedAt: Date.now() });
                activeSlotsRef.current = activeSlotsRef.current.filter((s) => s.id !== item.id);
                setActiveSlots(activeSlotsRef.current);
                hideTimersRef.current.delete(item.id);
            }, item.duration);
            hideTimersRef.current.set(item.id, timerId);
        },
        [clearHideTimer],
    );

    // ─── LOOP DE SPAWN DE ITENS ──────────────────────────────────────
    /**
     * Executado a cada tick do loop principal (`SPAWN_INTERVAL`).
     * Verifica se há vagas na grade e decide aleatoriamente se o novo item será um alvo legítimo
     * ou um distrator falso. Ajusta dinamicamente a probabilidade de surgimento de alvos caso a
     * entrega esteja atrasada em relação ao tempo da partida.
     */
    const spawnItem = useCallback(() => {
        if (!isGameRunningRef.current) return;

        const currentSlots = activeSlotsRef.current;

        // Respeita o limite máximo de itens ativos simultâneos na tela
        if (currentSlots.length >= MAX_ACTIVE_ITEMS) return;

        const slotIndex = pickFreeSlot(currentSlots);
        if (slotIndex === null) return;

        const tgtLeft = targetQuotaRef.current;
        let isTarget = false;

        // Lógica de balanceamento dinâmico do surgimento de alvos
        if (tgtLeft > 0) {
            const elapsed = timeLimitSeconds - timeLeftRef.current;
            const progress = elapsed / (timeLimitSeconds || 1);

            // Calcula a cota esperada até o momento atual da partida
            const expectedQuotaUsed = progress * computeTargetQuota(timeLimitSeconds);
            const isBehind = (computeTargetQuota(timeLimitSeconds) - tgtLeft) < expectedQuotaUsed;

            // Se o jogo estiver atrasado na entrega de alvos, aumenta a chance de spawn para 80% (senão 40%)
            isTarget = Math.random() < (isBehind ? 0.80 : 0.40);
        }

        if (isTarget) {
            targetQuotaRef.current -= 1;
            targetsAppearedRef.current += 1;
        }

        // Constrói o objeto do novo item
        const nextItem = {
            id: nextItemIdRef.current++,
            index: slotIndex,
            icon: isTarget
                ? targetIcon
                : ICONS_DECOY[Math.floor(Math.random() * ICONS_DECOY.length)],
            duration: getRandomItemTime(),
            isTarget,
        };

        const newSlots = [...currentSlots, nextItem];
        activeSlotsRef.current = newSlots;
        setActiveSlots(newSlots);
        scheduleItemRemoval(nextItem);
    }, [getRandomItemTime, pickFreeSlot, scheduleItemRemoval, targetIcon]);

    // ─── INICIALIZAÇÃO DA PARTIDA (startGame) ────────────────────────
    /**
     * Reinicia todas as referências, temporizadores e pontuações para iniciar um novo jogo.
     */
    const startGame = useCallback(() => {
        targetQuotaRef.current = computeTargetQuota(timeLimitSeconds);

        setGameStarted(true);
        setGameActive(true);
        setFinalScore(0);
        setTimeLeft(timeLimitSeconds);
        scoreRef.current = 0;
        targetsHitRef.current = 0;
        targetsAppearedRef.current = 0;
        wrongClicksRef.current = 0;
        timeLeftRef.current = timeLimitSeconds;
        endTimeRef.current = Date.now() + timeLimitSeconds * 1000;
        setFinished(false);
        setReported(false);
        activeSlotsRef.current = [];
        setActiveSlots([]);
        recentlyRemovedRef.current.clear();
        nextItemIdRef.current = 1;
        isGameRunningRef.current = true;
    }, [timeLimitSeconds]);

    // Inicia a partida automaticamente ao carregar o componente (sem tela de antemenu)
    useEffect(() => {
        startGame();
    }, [startGame]);

    // ─── GESTÃO DO CRONÔMETRO REGRESSIVO OTIMIZADO ───────────────────
    useEffect(() => {
        if (!gameActive || finished) return;

        const tick = () => {
            const end = endTimeRef.current ?? (Date.now() + timeLimitSeconds * 1000);
            const remainingMs = Math.max(0, end - Date.now());
            const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
            timeLeftRef.current = remainingSec;
            
            // Só dispara re-render do React quando o segundo inteiro realmente mudar
            setTimeLeft((prev) => (prev !== remainingSec ? remainingSec : prev));

            // Encerra a partida ao zerar o cronômetro
            if (remainingMs <= 0) {
                setFinished(true);
                setGameActive(false);
                isGameRunningRef.current = false;
                activeSlotsRef.current = [];
                setActiveSlots([]);
            }
        };

        countdownRef.current = setInterval(tick, 200);
        tick();

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [gameActive, finished, timeLimitSeconds]);

    // ─── EXECUÇÃO DO LOOP PRINCIPAL DE SPAWN ─────────────────────────
    useEffect(() => {
        if (!gameActive || finished) return;

        const clearTimers = () => {
            if (spawnLoopRef.current) clearInterval(spawnLoopRef.current);
            hideTimersRef.current.forEach((tid) => clearTimeout(tid));
            hideTimersRef.current.clear();
        };

        spawnLoopRef.current = setInterval(() => {
            spawnItem();
        }, SPAWN_INTERVAL);

        return clearTimers;
    }, [finished, gameActive, spawnItem]);

    // ─── REGISTRO E ENVIO DA PONTUAÇÃO FINAL ─────────────────────────
    useEffect(() => {
        if (!finished || reported) return;

        // Calcula a porcentagem de acertos baseada na cota inicial planejada
        const totalPlanned = computeTargetQuota(timeLimitSeconds);
        const hitCount = targetsHitRef.current;

        // Cada acerto vale proporcionalmente (100 / totalPlanned) pontos
        const baseScore = Math.floor((hitCount / (totalPlanned || 1)) * 100);
        const finalPts = Math.max(0, baseScore);

        setFinalScore(finalPts);

        const payload = {
            game: "Omni-Catch",
            score: finalPts,
            points: finalPts,
            remainingSeconds: Math.max(0, timeLeftRef.current),
            timedOut: timeLeftRef.current <= 0
        };

        const finalPayload = sanitizeGamePayload(payload);
        const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
        const elapsed = Math.max(0, Math.floor(timeLimitSeconds - timeLeftRef.current));
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
        onGameOver?.(finalPayload);

        // Notifica Dialog central (payload sanitizado)
        import("../../Dialog/gameEndReporter")
            .then((m) => {
                if (m.reportGameEnd) {
                    m.reportGameEnd(dialogPayload);
                }
            })
            .catch(() => { });

        setReported(true);
    }, [finished, reported, onScore, onGameOver, timeLimitSeconds]);

    // ─── PROCESSAMENTO DE CLIQUES NOS SLOTS (handleSlotClick) ────────
    /**
     * Valida o clique do jogador em um slot da grade.
     * Cancela o temporizador de desaparecimento do item, verifica se era um alvo legítimo
     * (incrementando a pontuação e checando vitória antecipada) ou um distrator falso.
     * Aplica feedback visual temporário (verde) e remove o item do slot.
     */
    const handleSlotClick = useCallback(
        (slotIndex) => {
            let clickedSlot = activeSlotsRef.current.find((s) => s.index === slotIndex);

            // Tolerância de toque: se o item expirou há menos de 450ms, ainda computa o acerto
            if (!clickedSlot && recentlyRemovedRef.current.has(slotIndex)) {
                const recent = recentlyRemovedRef.current.get(slotIndex);
                if (Date.now() - recent.removedAt <= 450) {
                    clickedSlot = recent;
                    recentlyRemovedRef.current.delete(slotIndex);
                }
            }

            if (!clickedSlot) return;

            clearHideTimer(clickedSlot.id);

            const totalPlanned = computeTargetQuota(timeLimitSeconds);

            if (clickedSlot.isTarget) {
                targetsHitRef.current += 1;
                // Atualiza a pontuação em tempo real baseada no percentual de acertos
                const currentPct = Math.floor((targetsHitRef.current / (totalPlanned || 1)) * 100);
                setFinalScore(currentPct);

                // Se o jogador acertou todos os alvos planejados, encerra a partida com vitória antecipada
                if (targetsHitRef.current >= totalPlanned) {
                    setFinished(true);
                    setGameActive(false);
                    isGameRunningRef.current = false;
                }
            } else {
                wrongClicksRef.current += 1;
                // Mantém a porcentagem atual sem somar pontos (distratores não penalizam o score base)
                const currentPct = Math.floor((targetsHitRef.current / (totalPlanned || 1)) * 100);
                setFinalScore(currentPct);
            }

            // Marca o item como clicado para ativar o flash verde de feedback na View
            setClickedIds((prev) => new Set(prev).add(clickedSlot.id));

            // Remove o item e o estado de clique após 250ms de animação
            setTimeout(() => {
                activeSlotsRef.current = activeSlotsRef.current.filter((s) => s.id !== clickedSlot.id);
                setActiveSlots(activeSlotsRef.current);
                setClickedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(clickedSlot.id);
                    return next;
                });
            }, 250);
        },
        [clearHideTimer],
    );

    // Retorna a API pública do Custom Hook para consumo da View
    return {
        score: finalScore,
        timeLeft,
        gameActive,
        gameStarted,
        finished,
        targetIcon,
        timeLimitSeconds,
        activeSlots,
        clickedIds,
        gridSize,
        startGame,
        handleSlotClick,
    };
}
