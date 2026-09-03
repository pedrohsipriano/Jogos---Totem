import { useEffect, useRef, useState, useCallback } from "react";
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";

/**
 * Tipos de itens disponíveis no jogo Cesta de Ofertas.
 */
const ITEM_TYPES = {
    GOOD: "good",       // Itens positivos (caixas, celulares, moedas)
    BAD: "bad",         // Itens negativos/perigosos (bombas, lixeiras)
    SPECIAL: "special", // Itens especiais de alto valor (estrelas douradas)
};

// Tempo base de referência para o cálculo proporcional da quantidade de itens
const BASE_TIME_SECONDS = 30;

// Quantidade padrão de itens gerados para uma partida de 30 segundos
const BASE_COUNTS = {
    [ITEM_TYPES.GOOD]: 49,
    [ITEM_TYPES.BAD]: 54,
    [ITEM_TYPES.SPECIAL]: 15,
};

// Total base de itens somados
const BASE_TOTAL =
    BASE_COUNTS[ITEM_TYPES.GOOD] +
    BASE_COUNTS[ITEM_TYPES.BAD] +
    BASE_COUNTS[ITEM_TYPES.SPECIAL];

/**
 * Retorna um número de ponto flutuante aleatório entre min e max.
 */
const randomBetween = (min, max) => min + Math.random() * (max - min);

/**
 * Algoritmo Fisher-Yates para embaralhar o plano de surgimento de itens.
 */
const fisherYatesShuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

/**
 * Constrói o plano de surgimento (spawn plan) de itens para a partida.
 * Calcula a quantidade proporcional de itens bons, ruins e especiais com base no tempo limite da partida,
 * distribui os restos fracionários e embaralha a lista resultante.
 * 
 * @param {number} timeLimitSeconds - Tempo total da partida em segundos.
 * @returns {string[]} Array embaralhado contendo a sequência exata de tipos de itens a serem gerados.
 */
const buildSpawnPlan = (timeLimitSeconds) => {
    const scale = Math.max(0, timeLimitSeconds) / BASE_TIME_SECONDS;
    const targetTotal = Math.max(1, Math.round(BASE_TOTAL * scale));

    const rawGood = BASE_COUNTS[ITEM_TYPES.GOOD] * scale;
    const rawBad = BASE_COUNTS[ITEM_TYPES.BAD] * scale;
    const rawSpecial = BASE_COUNTS[ITEM_TYPES.SPECIAL] * scale;

    const counts = {
        [ITEM_TYPES.GOOD]: Math.floor(rawGood),
        [ITEM_TYPES.BAD]: Math.floor(rawBad),
        [ITEM_TYPES.SPECIAL]: Math.floor(rawSpecial),
    };

    let remainder =
        targetTotal -
        (counts[ITEM_TYPES.GOOD] +
            counts[ITEM_TYPES.BAD] +
            counts[ITEM_TYPES.SPECIAL]);

    const fractions = [
        { type: ITEM_TYPES.GOOD, frac: rawGood - counts[ITEM_TYPES.GOOD] },
        { type: ITEM_TYPES.BAD, frac: rawBad - counts[ITEM_TYPES.BAD] },
        {
            type: ITEM_TYPES.SPECIAL,
            frac: rawSpecial - counts[ITEM_TYPES.SPECIAL],
        },
    ].sort((a, b) => b.frac - a.frac);

    let idx = 0;
    while (remainder > 0) {
        const type = fractions[idx % fractions.length].type;
        counts[type] += 1;
        remainder -= 1;
        idx += 1;
    }

    const plan = [];
    for (let i = 0; i < counts[ITEM_TYPES.GOOD]; i += 1) {
        plan.push(ITEM_TYPES.GOOD);
    }
    for (let i = 0; i < counts[ITEM_TYPES.BAD]; i += 1) {
        plan.push(ITEM_TYPES.BAD);
    }
    for (let i = 0; i < counts[ITEM_TYPES.SPECIAL]; i += 1) {
        plan.push(ITEM_TYPES.SPECIAL);
    }

    return fisherYatesShuffle(plan);
};

/**
 * Instancia um novo item cadente com posição X aleatória, velocidade calculada e ícone correspondente.
 * 
 * @param {number} width - Largura atual do canvas em pixels.
 * @param {number} speedFactor - Fator multiplicador de velocidade (aumenta conforme o progresso da partida).
 * @param {number} baselineVy - Velocidade vertical base calculada a partir da altura da tela.
 * @param {string} type - Tipo do item (good, bad, special).
 * @returns {Object} Objeto representando o item cadente com ID único, coordenadas e física.
 */
const buildItem = (width, speedFactor, baselineVy, type) => {
    // Dimensões específicas por tipo (largura x altura)
    let w, h;
    if (type === ITEM_TYPES.GOOD) {
        w = 92.25;
        h = 54;
    } else if (type === ITEM_TYPES.BAD) {
        w = 57;
        h = 57;
    } else {
        w = 72;
        h = 54;
    }

    const margin = Math.max(w, h) + 12;

    return {
        id: `${Date.now()}-${Math.random()}`,
        type,
        x: randomBetween(margin, Math.max(margin + 1, width - margin)),
        y: -h, // Inicia acima da tela para queda suave
        w,
        h,
        vy: randomBetween(0.9, 1.15) * baselineVy * speedFactor,
        icon:
            type === ITEM_TYPES.GOOD
                ? ["📦", "📱", "🪙", "✅"][Math.floor(Math.random() * 4)]
                : type === ITEM_TYPES.BAD
                    ? ["💥", "⚠️", "↩️", "🗑️"][Math.floor(Math.random() * 4)]
                    : "⭐",
        img: null,
    };
};

/**
 * Hook que encapsula a lógica e o loop de renderização do jogo Cesta de Ofertas.
 *
 * Contrato de entrada:
 *   data     — não utilizado neste jogo (independente de API)
 *   settings — { timeLimitSeconds }
 *
 * Contrato de saída (callbacks):
 *   onScore(payload)      — disparado quando a partida termina
 *   onRoundComplete()     — (não se aplica a este jogo contínuo)
 *   onGameOver(payload)   — disparado quando o tempo esgota
 */
export default function useCatchGameLogic({
    data = {},
    settings = {},
    onScore,
    onGameOver,
}) {
    const { timeLimitSeconds = 30, initialFallTimeSeconds = 10 } = settings;
    const pointsToWin = Math.max(0, Number(settings.pointsToWin ?? 100));

    // Ajuste vertical da cesta em pixels (positivo = sobe)
    const BASKET_Y_NUDGE = 20;

    // Referências para conectar os elementos DOM da View (Canvas e Stage)
    const canvasRef = useRef(null);
    const stageRef = useRef(null);

    // Referências mutáveis para o Game Loop (utilizadas para garantir altíssima performance a 60 FPS sem causar re-renderizações no React)
    const rafRef = useRef(0);                                             // ID do requestAnimationFrame
    const prevTsRef = useRef(0);                                          // Timestamp do quadro anterior
    const basketRef = useRef({ x: 240, targetX: 240, y: 470, w: 180, h: 61, glow: 0, glowType: null, glowDuration: 0, lerpSpeed: 30 }); // Coordenadas, alvo de deslize e dimensões da cesta
    const basketImgRef = useRef(null);                                    // Imagem opcional da cesta (overlay drawable)
    const basketImgLoadedRef = useRef(false);
    // Arrays de imagens para itens (pré-carregadas se existirem em /public/images)
    const goodImgsRef = useRef([]);
    const badImgsRef = useRef([]);
    const specialImgsRef = useRef([]);
    const itemsRef = useRef([]);                                          // Lista ativa de itens em queda
    const particlesRef = useRef([]);                                      // Partículas de explosão ativas
    const shakeDurationRef = useRef(0);                                   // Duração do tremor de tela restante
    const spawnPlanRef = useRef([]);                                      // Plano completo de surgimento de itens
    const spawnedCountRef = useRef(0);                                    // Contador de itens já gerados

    const pointsRef = useRef(0);                                          // Pontuação atual acumulada em tempo real
    const remainingRef = useRef(timeLimitSeconds);                        // Tempo restante exato em ponto flutuante
    const timedOutRef = useRef(false);                                    // Flag de tempo esgotado
    const finishedRef = useRef(false);                                    // Flag de fim de jogo

    // Estados Reativos do HUD (Sincronizados periodicamente para atualizar a interface gráfica)
    const [points, setPoints] = useState(0);
    const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
    const [finished, setFinished] = useState(false);
    const [reported, setReported] = useState(false);

    // Sincroniza refs mutáveis com estado React apenas quando necessário
    const syncHud = useCallback(() => {
        setPoints(Math.max(0, pointsRef.current));
        setTimeLeft(Math.max(0, Math.ceil(remainingRef.current)));
    }, []);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        if (!canvas || !stage) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = stage.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));

        const basket = basketRef.current;
        basket.y = rect.height - 54 - BASKET_Y_NUDGE;
        basket.x = Math.min(
            Math.max(basket.x, basket.w / 2),
            rect.width - basket.w / 2,
        );
        basket.targetX = basket.x;
    }, []);

    // Load optional basket image from public folder. If you want a custom cart image,
    // drop it in `public/images/cart.png` (or change the path below) and it will be used.
    useEffect(() => {
        const img = new Image();
        img.src = "/images/cart.png"; // fallback: replace with your image path or add cart.png
        img.onload = () => {
            basketImgRef.current = img;
            basketImgLoadedRef.current = true;
        };
        img.onerror = () => {
            // no-op: keep using canvas-drawn basket
            basketImgRef.current = null;
            basketImgLoadedRef.current = false;
        };

        return () => {
            basketImgRef.current = null;
            basketImgLoadedRef.current = false;
        };
    }, []);

    // Pré-carrega imagens de exemplo para itens (substitua paths conforme desejar)
    useEffect(() => {
        const goodPaths = [
            "/images/Attach-Money.png",
            "/images/Attach-Money2.png",
            "/images/Attach-Money3.png",
        ];
        const badPaths = [
            "/images/exclamacaobad.png",
            "/images/xbad.png",
        ];
        const specialPaths = [
            "/images/dinheirospecial.png",
        ];

        const load = (paths) => {
            return paths.map((p) => {
                const i = new Image();
                i.src = p;
                // ignore errors, only push onload
                i.onload = () => { };
                return i;
            });
        };

        goodImgsRef.current = load(goodPaths);
        badImgsRef.current = load(badPaths);
        specialImgsRef.current = load(specialPaths);

        // no cleanup necessary for images
    }, []);

    const restartGame = useCallback(() => {
        pointsRef.current = 0;
        remainingRef.current = timeLimitSeconds;
        timedOutRef.current = false;
        finishedRef.current = false;
        itemsRef.current = [];
        spawnPlanRef.current = buildSpawnPlan(timeLimitSeconds);
        spawnedCountRef.current = 0;
        prevTsRef.current = 0;
        basketRef.current.targetX = basketRef.current.x;
        basketRef.current.glow = 0;
        basketRef.current.glowType = null;
        basketRef.current.glowDuration = 0;
        particlesRef.current = [];
        shakeDurationRef.current = 0;

        setFinished(false);
        setReported(false);
        syncHud();
    }, [timeLimitSeconds, syncHud]);

    /**
     * ATUALIZAÇÃO DA FÍSICA E LÓGICA DO JOGO (update)
     * Executada a cada quadro do requestAnimationFrame. Atualiza o tempo, calcula a aceleração progressiva,
     * gera novos itens conforme o plano de spawn, move os itens cadentes e verifica colisões com a cesta.
     */
    const update = useCallback(
        (deltaSec, width, height) => {
            // Calcula a velocidade baseline baseada no tempo inicial desejado
            const baselineVy = height / Math.max(1, initialFallTimeSeconds);

            if (finishedRef.current) return;

            remainingRef.current = Math.max(0, remainingRef.current - deltaSec);

            // Calcula o fator de aceleração: os itens caem até 3.1x mais rápido no final da partida
            const elapsed = timeLimitSeconds - remainingRef.current;
            const progress = Math.min(
                1,
                elapsed / Math.max(1, timeLimitSeconds),
            );
            const speedFactor = 1 + progress * 2.1;
            const planLength = spawnPlanRef.current.length;
            const expectedSpawned = Math.min(
                planLength,
                Math.floor((elapsed / Math.max(1, timeLimitSeconds)) * planLength),
            );

            // Gera novos itens se a cota esperada para o tempo atual ainda não foi atingida
            while (spawnedCountRef.current < expectedSpawned) {
                const type = spawnPlanRef.current[spawnedCountRef.current];
                const newItem = buildItem(width, speedFactor, baselineVy, type);
                // attach image from preloaded pools if available
                try {
                    if (type === ITEM_TYPES.GOOD && goodImgsRef.current.length) {
                        newItem.img = goodImgsRef.current[Math.floor(Math.random() * goodImgsRef.current.length)];
                    } else if (type === ITEM_TYPES.BAD && badImgsRef.current.length) {
                        newItem.img = badImgsRef.current[Math.floor(Math.random() * badImgsRef.current.length)];
                    } else if (type === ITEM_TYPES.SPECIAL && specialImgsRef.current.length) {
                        newItem.img = specialImgsRef.current[Math.floor(Math.random() * specialImgsRef.current.length)];
                    }
                } catch (e) {
                    // ignore
                }

                itemsRef.current.push(newItem);
                spawnedCountRef.current += 1;
            }

            const basket = basketRef.current;

            // Movimentação suavizada (Lerp estável baseado em tempo) em direção ao targetX
            basket.x += (basket.targetX - basket.x) * (1 - Math.exp(-basket.lerpSpeed * deltaSec));

            if (basket.glowDuration > 0) {
                basket.glowDuration -= deltaSec;
                if (basket.glowDuration <= 0) {
                    basket.glowDuration = 0;
                    basket.glowType = null;
                }
            }

            // Atualiza o tempo do tremor de tela
            if (shakeDurationRef.current > 0) {
                shakeDurationRef.current = Math.max(0, shakeDurationRef.current - deltaSec);
            }

            // Atualiza o movimento das partículas
            const nextParticles = [];
            for (const p of particlesRef.current) {
                p.life -= deltaSec;
                if (p.life > 0) {
                    p.x += p.vx * deltaSec;
                    p.y += p.vy * deltaSec;
                    p.vy += 180 * deltaSec; // Gravidade
                    nextParticles.push(p);
                }
            }
            particlesRef.current = nextParticles;

            const nextItems = [];
            // Percorre os itens em queda atualizando sua posição Y e checando colisões
            for (const item of itemsRef.current) {
                item.y += item.vy * deltaSec;

                const halfH = item.h / 2;
                const halfW = item.w / 2;

                const withinY =
                    item.y + halfH >= basket.y &&
                    item.y - halfH <= basket.y + basket.h;
                const withinX =
                    item.x + halfW >= basket.x - basket.w / 2 &&
                    item.x - halfW <= basket.x + basket.w / 2;

                // Colisão detectada com a cesta
                if (withinY && withinX) {
                    if (item.type === ITEM_TYPES.BAD) {
                        pointsRef.current = Math.max(0, pointsRef.current - 10); // Penalidade por item ruim
                        basket.glowType = ITEM_TYPES.BAD;
                        basket.glowDuration = 0.3;
                        shakeDurationRef.current = 0.2; // 0.2 segundos de tremor

                        // Gera partículas de explosão
                        for (let i = 0; i < 15; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = randomBetween(80, 220);
                            particlesRef.current.push({
                                x: item.x,
                                y: item.y,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed - 50, // viés levemente para cima
                                color: ["#ef4444", "#f97316", "#facc15"][Math.floor(Math.random() * 3)],
                                radius: randomBetween(3, 8),
                                life: 0.5,
                                maxLife: 0.5,
                            });
                        }
                    } else if (item.type === ITEM_TYPES.SPECIAL) {
                        pointsRef.current += 20; // Bônus por item especial
                        basket.glowType = ITEM_TYPES.SPECIAL;
                        basket.glowDuration = 0.3;
                    } else {
                        pointsRef.current += 10; // Pontos por item bom
                        basket.glowType = ITEM_TYPES.GOOD;
                        basket.glowDuration = 0.3;
                    }
                } else if (item.y - halfH > height) {
                    // Item especial perdido no fundo da tela gera penalidade
                    if (item.type === ITEM_TYPES.SPECIAL) {
                        pointsRef.current = Math.max(0, pointsRef.current - 20);
                    }
                } else {
                    nextItems.push(item);
                }
            }

            itemsRef.current = nextItems;

            // Verifica se o tempo se esgotou
            if (remainingRef.current <= 0) {
                timedOutRef.current = true;
                finishedRef.current = true;
                setFinished(true);
            }

            syncHud();
        },
        [timeLimitSeconds, initialFallTimeSeconds, syncHud],
    );

    /**
     * RENDERIZAÇÃO GRÁFICA NO CANVAS (draw)
     * Limpa o quadro anterior e desenha todos os itens cadentes com suas respectivas cores de fundo,
     * bordas e ícones emoji. Em seguida, desenha a cesta do jogador com efeito de brilho (glow) ativo ao coletar itens.
     */
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Aplica o tremor de tela salvando o contexto
        ctx.save();
        if (shakeDurationRef.current > 0) {
            const shakeAmount = 8 * (shakeDurationRef.current / 0.2);
            ctx.translate(randomBetween(-shakeAmount, shakeAmount), randomBetween(-shakeAmount, shakeAmount));
        }

        // Desenha os itens cadentes
        for (const item of itemsRef.current) {
            const isBad = item.type === ITEM_TYPES.BAD;
            const isSpecial = item.type === ITEM_TYPES.SPECIAL;

            ctx.beginPath();
            ctx.fillStyle = isSpecial
                ? "rgba(254, 220, 80, 0.18)"
                : isBad
                    ? "rgba(239, 68, 68, 0.18)"
                    : "rgba(14, 165, 233, 0.16)";
            ctx.strokeStyle = isSpecial
                ? "#fedc50"
                : isBad
                    ? "#ef4444"
                    : "#38bdf8";
            ctx.lineWidth = 2;

            // desenha retângulo com w/h do item
            ctx.roundRect(
                item.x - item.w / 2,
                item.y - item.h / 2,
                item.w,
                item.h,
                15,
            );
            ctx.fill();
            ctx.stroke();

            if (item.img && item.img.complete) {
                // desenha a imagem do item centralizada com proporções w x h
                ctx.drawImage(
                    item.img,
                    Math.floor(item.x - item.w / 2),
                    Math.floor(item.y - item.h / 2),
                    Math.floor(item.w),
                    Math.floor(item.h),
                );
            } else {
                const fontSize = Math.floor(Math.max(item.w, item.h) * 0.5);
                ctx.font = `${fontSize}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#f8fafc";
                ctx.fillText(item.icon, item.x, item.y + 1);
            }
        }

        // Desenha a cesta do jogador: usa imagem se carregada, caso contrário desenha vetorial
        const basket = basketRef.current;

        // Desenha a sombra/glow atrás da cesta se houver um item coletado recentemente
        if (basket.glowDuration > 0 && basket.glowType) {
            ctx.save();
            const opacity = Math.min(0.6, basket.glowDuration / 0.3) * 0.6; // Desvanecimento suave
            let colorStop;
            if (basket.glowType === ITEM_TYPES.SPECIAL) {
                colorStop = `rgba(254, 220, 80, ${opacity})`; // Amarelo (especial)
            } else if (basket.glowType === ITEM_TYPES.BAD) {
                colorStop = `rgba(239, 68, 68, ${opacity})`; // Vermelho (ruim)
            } else {
                colorStop = `rgba(14, 165, 233, ${opacity})`; // Azul (bom)
            }

            const gradX = basket.x;
            const gradY = basket.y + basket.h / 2;

            // Criar um gradiente radial esticado horizontalmente para combinar com o formato da cesta
            ctx.translate(gradX, gradY + 10);
            ctx.scale(1.2, 0.7);

            const outerRadius = basket.w * 0.8;
            const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, outerRadius);
            grad.addColorStop(0, colorStop);
            grad.addColorStop(0.5, colorStop.replace(`${opacity}`, `${opacity * 0.4}`));
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (basketImgLoadedRef.current && basketImgRef.current) {
            const img = basketImgRef.current;
            // desenha imagem ajustada à largura/altura da hitbox da cesta
            ctx.drawImage(
                img,
                Math.floor(basket.x - basket.w / 2),
                Math.floor(basket.y),
                Math.floor(basket.w),
                Math.floor(basket.h),
            );
            // no glow rendering
        } else {
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.shadowColor = "#fedc50";
            ctx.fillStyle = "rgba(246, 0, 133, 0.16)";
            ctx.strokeStyle = "#f60085";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(
                basket.x - basket.w / 2,
                basket.y,
                basket.w,
                basket.h,
                10,
            );
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "#f60085";
            ctx.lineWidth = 2;
            ctx.arc(
                basket.x - basket.w * 0.26,
                basket.y + basket.h + 8,
                5,
                0,
                Math.PI * 2,
            );
            ctx.arc(
                basket.x + basket.w * 0.26,
                basket.y + basket.h + 8,
                5,
                0,
                Math.PI * 2,
            );
            ctx.stroke();
            ctx.restore();
        }

        // Desenha as partículas de explosão por cima de tudo
        for (const p of particlesRef.current) {
            ctx.save();
            ctx.beginPath();
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Restaura a translação do tremor de tela
        ctx.restore();
    }, []);

    const loop = useCallback(
        (ts) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            if (!prevTsRef.current) prevTsRef.current = ts;
            const deltaSec = Math.min(0.033, (ts - prevTsRef.current) / 1000);
            prevTsRef.current = ts;

            update(deltaSec, width, height);
            draw();

            rafRef.current = requestAnimationFrame(loop);
        },
        [update, draw],
    );

    // Event handlers da View
    const handlePointerDown = useCallback((event) => {
        if (finishedRef.current) return;
        const stage = stageRef.current;
        if (!stage) return;

        const rect = stage.getBoundingClientRect();
        const nextX = event.clientX - rect.left;
        const basket = basketRef.current;
        const clamped = Math.max(
            basket.w / 2,
            Math.min(rect.width - basket.w / 2, nextX),
        );
        basket.targetX = clamped;
        basket.lerpSpeed = 3.8; // Velocidade bem mais lenta ao clicar para o cesto deslizar de forma suave e visível
    }, []);

    const handlePointerMove = useCallback((event) => {
        if (finishedRef.current) return;
        const stage = stageRef.current;
        if (!stage) return;

        const rect = stage.getBoundingClientRect();
        const nextX = event.clientX - rect.left;
        const basket = basketRef.current;
        const clamped = Math.max(
            basket.w / 2,
            Math.min(rect.width - basket.w / 2, nextX),
        );
        basket.targetX = clamped;
        basket.lerpSpeed = 30; // Velocidade bem rápida para acompanhar o arrasto do dedo de forma imediata
    }, []);

    // Ciclo de vida do jogo
    useEffect(() => {
        resizeCanvas();
        restartGame();

        const onResize = () => resizeCanvas();
        window.addEventListener("resize", onResize);

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(rafRef.current);
        };
    }, [timeLimitSeconds, resizeCanvas, restartGame, loop]);

    // Reportar final de jogo
    useEffect(() => {
        if (!finished || reported) return;

        const payload = {
            game: "Cesta de Ofertas",
            score: pointsRef.current,
            points: pointsRef.current,
            remainingSeconds: Math.max(0, remainingRef.current),
            timedOut: timedOutRef.current,
        };

        // Callbacks normalizados com payload sanitizado
        const finalPayload = sanitizeGamePayload(payload);
        const remaining = Math.max(0, Math.floor(payload.remainingSeconds ?? 0));
        const elapsed = Math.max(0, Math.floor(timeLimitSeconds - remainingRef.current));
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
        // Também notifica o Dialog global via emissor
        // Import dinâmico sem await para não exigir função async
        import("../../Dialog/gameEndReporter")
            .then((m) => {
                if (m.reportGameEnd) {
                    m.reportGameEnd(dialogPayload);
                }
            })
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.warn("gameEndReporter not available:", e);
            });

        setReported(true);
    }, [finished, reported, onScore, onGameOver]);

    return {
        // Conexões de DOM
        canvasRef,
        stageRef,

        // Estado React (HUD)
        points,
        timeLeft,
        finished,
        timedOut: timedOutRef.current,

        // Ações
        handlePointerDown,
        handlePointerMove,
        restartGame,
    };
}
