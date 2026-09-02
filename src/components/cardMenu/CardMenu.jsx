import { Button } from "../componentsTag/button";
import { Titulo } from "../titulo/Titulo";
import "./card.styles.css";

const LABEL_BY_KEY = {
  timeLimitSeconds: "Tempo máximo",
  timeLimit: "Tempo máximo",
  pairCount: "Quantidade de pares",
  pairs: "Quantidade de pares",
  wordLimit: "Quantidade de palavras",
  wordCount: "Quantidade de palavras",
  questionLimit: "Quantidade de perguntas",
  questionCount: "Quantidade de perguntas",
  gridSize: "Tamanho do grid",
  maxAttempts: "Tentativas máximas",
  maxLives: "Vidas máximas",
  initialFallTimeSeconds: "Tempo inicial de queda",
  seed: "Semente",
};

const NUMBER_KEYS = new Set([
  "timeLimitSeconds",
  "timeLimit",
  "pairCount",
  "pairs",
  "wordLimit",
  "wordCount",
  "questionLimit",
  "questionCount",
  "gridSize",
  "maxAttempts",
  "maxLives",
  "initialFallTimeSeconds",
  "hangmanWordLength",
  "labirintoWordLength",
]);

const normalizeKey = (key) => {
  const raw = String(key ?? "").trim();
  if (raw === "timeLimit" || raw === "timeLimitSeconds")
    return "timeLimitSeconds";
  if (raw === "pairs" || raw === "pairCount") return "pairCount";
  if (raw === "wordCount" || raw === "wordLimit") return "wordLimit";
  if (raw === "questionCount" || raw === "questionLimit")
    return "questionLimit";
  if (raw === "grid" || raw === "gridSize") return "gridSize";
  if (raw === "attempts" || raw === "maxAttempts") return "maxAttempts";
  if (raw === "lives" || raw === "maxLives") return "maxLives";
  if (raw === "initialFallTime" || raw === "initialFallTimeSeconds") {
    return "initialFallTimeSeconds";
  }
  return raw;
};

const humanizeKey = (key) => {
  const normalized = normalizeKey(key);
  return (
    LABEL_BY_KEY[normalized] ?? normalized.replace(/([a-z])([A-Z])/g, "$1 $2")
  );
};

const parseValue = (key, value) => {
  if (value === null || value === undefined || value === "") return value;

  if (typeof value === "number" || NUMBER_KEYS.has(normalizeKey(key))) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed !== "" && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const formatFieldValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
};

const getInputType = (key, value) => {
  if (typeof value === "boolean") return "checkbox";
  if (NUMBER_KEYS.has(normalizeKey(key))) return "number";
  return "text";
};

const getNumberAttributes = (key) => {
  const normalized = normalizeKey(key);

  if (normalized === "timeLimitSeconds") return { min: 10, max: 600, step: 10 };
  if (normalized === "pairCount") return { min: 2, max: 20, step: 1 };
  if (normalized === "wordLimit" || normalized === "questionLimit") {
    return { min: 1, max: 50, step: 1 };
  }
  if (normalized === "gridSize") return { min: 4, max: 20, step: 1 };
  if (normalized === "maxAttempts") return { min: 1, max: 999, step: 1 };
  if (normalized === "maxLives") return { min: 1, max: 20, step: 1 };
  if (normalized === "initialFallTimeSeconds")
    return { min: 1, max: 60, step: 1 };

  return { step: 1 };
};

export function CardMenu({
  title,
  code,
  gameId,
  settings = [],
  onStartGame,
  interactive = true,
  defaultConfig = {},
  timeLimits,
  pointsToWin,
  catchInitialFallTimes,
  wordSearchWordLimits,
  wordSearchWordBounds,
  hangmanWordLengths,
  labirintoWordLengths,
  pairsLimits,
  gridSizes,
  quizQuestionBounds,
  quizQuestionLimits,
  soletraWordBounds,
  soletraWordLimits,
  onTimeLimitChange,
  onPointsToWinChange,
  onCatchInitialFallTimeChange,
  onWordSearchWordLimitChange,
  onHangmanWordLengthChange,
  onLabirintoWordLengthChange,
  onPairsChange,
  onGridSizeChange,
  onQuizLimitChange,
  onSoletraWordLimitChange,
  children,
  configDefs = null,
  configDraft = null,
  onConfigChange = null,
  onConfigSave = null,
  configSaving = false,
  isAdm = false,
}) {
  const hasAdminConfig = Array.isArray(configDefs) && configDefs.length > 0;
  const hasSettings = Array.isArray(settings) && settings.length > 0;

  const presetOptions = {
    wordsearch: { gridSize: [5, 8, 10] },
    labirinto: { gridSize: [8, 10], labirintoWordLength: [3, 4, 5, 6, 7] },
    whac: { gridSize: [8, 10, 12, 14] },
    hangman: { hangmanWordLength: [3, 4, 5, 6, 7, 8, 9, 10] },
  };

  const editableSettings = settings.map((setting) => {
    const key = normalizeKey(setting.key);
    let value = defaultConfig[key] ?? setting.value ?? "";
    // Ensure time default is 30 seconds when not provided
    if (
      (value === "" || value === null || value === undefined) &&
      key === "timeLimitSeconds"
    ) {
      value = 30;
    }
    const presetForGame = presetOptions[code] ?? {};
    const selectOptions = presetForGame[key] ?? null;

    return {
      key,
      label: setting.label ?? humanizeKey(setting.key),
      value,
      type: getInputType(setting.key, value),
      numberAttributes: getNumberAttributes(setting.key),
      selectOptions,
    };
  });

  const buildPayloadConfig = (formData) => {
    if (!hasSettings) return defaultConfig;

    return editableSettings.reduce((acc, setting) => {
      const rawValue = formData?.get(setting.key);
      // fallback to defaultConfig, then setting.value, finally ensure time default
      let fallbackValue = defaultConfig[setting.key] ?? setting.value;
      if (
        (fallbackValue === undefined ||
          fallbackValue === null ||
          fallbackValue === "") &&
        setting.key === "timeLimitSeconds"
      ) {
        fallbackValue = 30;
      }
      const resolvedValue =
        rawValue === null || rawValue === undefined || rawValue === ""
          ? fallbackValue
          : rawValue;

      acc[setting.key] = parseValue(setting.key, resolvedValue);
      return acc;
    }, {});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onStartGame?.({
      code,
      title,
      config: buildPayloadConfig(formData),
    });
  };

  const handleStart = () => {
    const currentConfig = { ...defaultConfig };

    if (timeLimits?.[gameId] !== undefined)
      currentConfig.timeLimitSeconds = timeLimits[gameId];
    if (pointsToWin?.[gameId] !== undefined)
      currentConfig.pointsToWin = pointsToWin[gameId];
    if (catchInitialFallTimes?.[gameId] !== undefined) {
      currentConfig.initialFallTimeSeconds = catchInitialFallTimes[gameId];
    }
    if (pairsLimits?.[gameId] !== undefined)
      currentConfig.pairCount = pairsLimits[gameId];

    if (gridSizes?.[gameId] !== undefined) {
      currentConfig.gridSize = gridSizes[gameId];
    } else if (code === "labirinto") {
      currentConfig.gridSize = 8;
    } else if (code === "wordsearch") {
      currentConfig.gridSize = 10;
    } else if (code === "whac") {
      currentConfig.gridSize = 12;
    } else {
      currentConfig.gridSize = 12;
    }

    if (wordSearchWordLimits?.[gameId] !== undefined) {
      currentConfig.wordLimit = wordSearchWordLimits[gameId];
    }
    if (hangmanWordLengths?.[gameId] !== undefined) {
      currentConfig.hangmanWordLength = hangmanWordLengths[gameId];
    }
    if (labirintoWordLengths?.[gameId] !== undefined) {
      currentConfig.labirintoWordLength = labirintoWordLengths[gameId];
    }
    if (quizQuestionLimits?.[gameId] !== undefined) {
      currentConfig.questionLimit = quizQuestionLimits[gameId];
    }
    if (soletraWordLimits?.[gameId] !== undefined) {
      currentConfig.soletraWordLimit = soletraWordLimits[gameId];
    }

    // Ensure a sensible default timeLimitSeconds when nothing else provided
    if (
      currentConfig.timeLimitSeconds === undefined ||
      currentConfig.timeLimitSeconds === null
    ) {
      currentConfig.timeLimitSeconds = 30;
    }

    onStartGame?.({ code, title, config: currentConfig });
  };

  const renderAdminConfig = () => {
    if (!hasAdminConfig) return null;

    const draft = configDraft ?? {};

    return (
      <form
        className="formCardMenu"
        onSubmit={(event) => {
          event.preventDefault();
          onConfigSave?.();
        }}
      >
        {configDefs.map((def) => {
          const value =
            draft[def.key] !== undefined ? draft[def.key] : def.defaultValue;
          const id = `${code ?? "admin"}-${def.key}`;

          return (
            <section className={`formCardMenuSection${def.type === "checkbox" ? " formCardMenuSection--checkbox" : ""}`} key={def.key}>
              <label htmlFor={id} className="labelCardMenu">
                {def.label}
              </label>
              {def.type === "checkbox" ? (
                <input
                  id={id}
                  className="inputCardMenuCheckbox"
                  type="checkbox"
                  checked={!!value}
                  onChange={(event) =>
                    onConfigChange?.(def.key, event.target.checked ? 1 : 0)
                  }
                />
              ) : def.type === "select" ? (
                <select
                  id={id}
                  className="inputCardMenu"
                  value={value}
                  onChange={(event) =>
                    onConfigChange?.(def.key, Number(event.target.value))
                  }
                >
                  {def.options.map((option) => {
                    let optionText = option;
                    if (def.key === "limitOneAttempt") {
                      optionText = option === 1 ? "Sim" : "Não";
                    }
                    return (
                      <option key={option} value={option}>
                        {optionText}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  id={id}
                  className="inputCardMenu"
                  type={getInputType(def.key, value)}
                  {...getNumberAttributes(def.key)}
                  value={formatFieldValue(value)}
                  onChange={(event) =>
                    onConfigChange?.(
                      def.key,
                      parseValue(def.key, event.target.value),
                    )
                  }
                />
              )}
            </section>
          );
        })}

        <Button
          classe="buttonComeceAJogar"
          type="submit"
          classeTexto="textoComeceAJogar"
          texto={configSaving ? "Salvando..." : "Salvar"}
          disabled={configSaving}
        />
      </form>
    );
  };

  return (
    <section className={`CardMenu ${isAdm ? "CardMenuAdm" : ""}`}>
      <Titulo texto={title} background={false} classe="TituloCard" />

      {children && <div className="CardMenu__content">{children}</div>}

      {hasAdminConfig ? (
        renderAdminConfig()
      ) : hasSettings ? (
        <form className="formCardMenu" onSubmit={handleSubmit}>
          {editableSettings.map((setting) => (
            <section className="formCardMenuSection" key={setting.key}>
              <label
                htmlFor={`${code}-${setting.key}`}
                className="labelCardMenu"
              >
                {setting.label}
              </label>
              {setting.selectOptions ? (
                <select
                  id={`${code}-${setting.key}`}
                  className="inputCardMenu"
                  name={setting.key}
                  defaultValue={setting.value}
                >
                  {setting.selectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${code}-${setting.key}`}
                  className="inputCardMenu"
                  name={setting.key}
                  type={setting.type}
                  {...setting.numberAttributes}
                  defaultValue={formatFieldValue(setting.value)}
                />
              )}
            </section>
          ))}

          <Button
            classe="buttonComeceAJogar"
            type="button"
            classeTexto="textoComeceAJogar"
            texto={interactive ? "Começar a jogar" : "Em breve"}
            disabled={!interactive}
            onClick={handleStart}
          />
        </form>
      ) : (
        <Button
          classe="buttonComeceAJogar"
          type="button"
          classeTexto="textoComeceAJogar"
          texto={interactive ? "Começar a jogar" : "Em breve"}
          disabled={!interactive}
          onClick={handleStart}
        />
      )}
    </section>
  );
}
