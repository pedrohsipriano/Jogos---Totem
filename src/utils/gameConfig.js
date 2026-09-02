const DEFAULT_GAME_CONFIG = {
    timeLimitSeconds: 30,
    pointsToWin: 100,
    initialFallTimeSeconds: 5,
    pairCount: 6,
    gridSize: 12,
    maxWords: 3,
    wordLimit: 3,
    maxAttempts: 5,
    maxLives: 5,
    hangmanWordLength: 5,
    hangmanWordLengthIsMin: 1,
    labirintoWordLength: 5,
    labirintoWordLengthIsMin: 1,
    questionLimit: 3,
    quizLimit: 3,
    soletraWordLimit: 3,
    soletraWordLimitIsMin: 0,
    limitOneAttempt: 0,
    wordLimitIsMin: 0,
};

export function normalizeGameSettingKey(key) {
    const raw = String(key ?? "").trim();
    if (raw === "timeLimit" || raw === "timeLimitSeconds") return "timeLimitSeconds";
    if (raw === "pairs" || raw === "pairCount") return "pairCount";
    if (raw === "wordCount" || raw === "wordLimit") return "wordLimit";
    if (raw === "questionCount" || raw === "questionLimit") return "questionLimit";
    if (raw === "grid" || raw === "gridSize") return "gridSize";
    if (raw === "attempts" || raw === "maxAttempts") return "maxAttempts";
    if (raw === "lives" || raw === "maxLives") return "maxLives";
    if (raw === "initialFallTime" || raw === "initialFallTimeSeconds") return "initialFallTimeSeconds";
    return raw;
}

export function parseGameSettingValue(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        try {
            return JSON.parse(trimmed);
        } catch {
            const numeric = Number(trimmed);
            return Number.isFinite(numeric) ? numeric : trimmed;
        }
    }
    return value;
}

export function buildDefaultGameConfig(gameCode = "") {
    const code = String(gameCode ?? "").toLowerCase();
    const base = { ...DEFAULT_GAME_CONFIG };

    if (code === "labirinto") base.gridSize = 8;
    if (code === "wordsearch" || code === "wordsearch_mulher") base.gridSize = 10;
    if (code === "whac") base.gridSize = 12;

    return base;
}

export function buildGameConfig(game, gameSettings = []) {
    if (!game) return buildDefaultGameConfig("");

    const gameId = String(game.id ?? "");
    const config = buildDefaultGameConfig(game.code);

    (gameSettings ?? []).forEach((setting) => {
        const settingGameId = String(setting?.gameId ?? setting?.Game?.id ?? "");
        if (settingGameId !== gameId) return;

        const key = normalizeGameSettingKey(setting.key);
        const value = parseGameSettingValue(setting.value);
        if (value === undefined || value === null || value === "") return;

        config[key] = value;
    });

    return config;
}
