import { useEffect, useMemo, useState } from "react";
import {
  createAdminRecord,
  deleteAdminRecord,
  getAdminRecords,
  updateAdminRecord,
  uploadImage,
  uploadImages,
} from "../../lib/appDatabase";
import "./adminHubV2.style.css";
import "../personalizacao/personalizacao.style.css";
import { Personalizacao } from "../personalizacao/Personalizacao.jsx";
import { AdminSecurity } from "./AdminSecurity.jsx";
import { CardForm } from "../cardForm/cardForm";
import GameNav from "../gameNav/GameNav";
import { CardMenu } from "../cardMenu/CardMenu";
import {
  getMemoryCardBack,
  setMemoryCardBack,
  removeMemoryCardBack,
} from "../../utils/themeManager";

/**
 * Ordem de exibição dos recursos na interface administrativa.
 */
const resourceOrder = [
  "players",
  "games",
  "words",
  "quizQuestions",
  "soletraRounds",
  "labirintoRounds",
];

/**
 * Mapeamento de chaves de recursos para rótulos legíveis em português.
 */
const resourceLabels = {
  players: "Usuários",
  games: "Jogos",
  words: "Palavras",
  quizQuestions: "Perguntas do Quiz",
  soletraRounds: "Frases / Soletra",
  labirintoRounds: "Palavras / Labirinto",
  playerGameScores: "Pontuações por jogo",
  scoreEvents: "Eventos de score",
  gameSettings: "Configurações",
};

/**
 * Definições de esquemas (schemas) para cada entidade do banco de dados.
 * Configura os campos do formulário de criação/edição, placeholders de busca e colunas da tabela.
 */
const resourceSchemas = {
  players: {
    title: "Usuários",
    searchPlaceholder: "Nome, telefone ou pontos",
    fields: [
      { key: "name", label: "Nome", type: "text" },
      { key: "phone", label: "Telefone", type: "text", required: true },
      { key: "totalPoints", label: "Pontos", type: "number" },
    ],
    emptyDraft: { name: "", phone: "", totalPoints: 0 },
    renderColumns: (row) => [
      row.id,
      row.name ?? "-",
      row.phone ?? "-",
      row.totalPoints ?? 0,
      formatDate(row.createdAt),
    ],
  },
  games: {
    title: "Jogos",
    searchPlaceholder: "Código ou nome",
    fields: [
      { key: "code", label: "Código", type: "text", required: true },
      { key: "name", label: "Nome", type: "text", required: true },
    ],
    emptyDraft: { code: "", name: "" },
    renderColumns: (row) => [row.id, row.code ?? "-", row.name ?? "-"],
  },
  words: {
    title: "Palavras",
    searchPlaceholder: "Palavra",
    fields: [
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        source: "games",
      },
      { key: "word", label: "Palavra (Individual)", type: "text" },
      { key: "hint", label: "Dica (para o Labirinto)", type: "text" },
      {
        key: "bulkWords",
        label: "Palavras em Massa (separadas por vírgula)",
        type: "textarea",
      },
      { key: "imageUrl", label: "Imagem", type: "image" },
    ],
    emptyDraft: { gameId: "", word: "", hint: "", bulkWords: "", imageUrl: "" },
    renderColumns: (row) => [
      row.id,
      row.Game?.code ?? row.gameId ?? "-",
      row.word ?? "-",
      row.imageUrl ?? "-",
    ],
  },
  quizQuestions: {
    title: "Perguntas do Quiz",
    searchPlaceholder: "Pergunta, resposta ou opções",
    fields: [
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        source: "games",
        required: true,
      },
      { key: "question", label: "Pergunta (Individual)", type: "text" },
      { key: "answer", label: "Resposta Certa", type: "text" },
      {
        key: "bulkQuestions",
        label:
          "Perguntas em Massa (Blocos de 5 linhas ou separado por vírgula)",
        type: "textarea",
      },
    ],
    emptyDraft: {
      gameId: "",
      question: "",
      answer: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctIndex: 0,
      bulkQuestions: "",
    },
    renderColumns: (row) => [
      row.id,
      row.question ?? row.prompt ?? "-",
      row.answer ?? "-",
    ],
  },
  soletraRounds: {
    title: "Frases / Soletra",
    searchPlaceholder: "Palavra ou dica",
    fields: [
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        source: "games",
        required: true,
      },
      { key: "word", label: "Palavra (Individual)", type: "text" },
      { key: "hint", label: "Frase / Dica", type: "text" },
      {
        key: "bulkRounds",
        label: "Rodadas em Massa (Formato: Palavra.Dica.)",
        type: "textarea",
      },
    ],
    emptyDraft: { gameId: "", word: "", hint: "", bulkRounds: "" },
    renderColumns: (row) => [row.id, row.word ?? "-", row.hint ?? "-"],
  },
  labirintoRounds: {
    title: "Palavras / Labirinto",
    searchPlaceholder: "Palavra ou dica",
    fields: [
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        source: "games",
        required: true,
      },
      { key: "word", label: "Palavra (Individual)", type: "text" },
      { key: "hint", label: "Frase / Dica", type: "text" },
      {
        key: "bulkRounds",
        label: "Rodadas em Massa (Formato: Palavra.Dica.)",
        type: "textarea",
      },
    ],
    emptyDraft: { gameId: "", word: "", hint: "", bulkRounds: "" },
    renderColumns: (row) => [row.id, row.word ?? "-", row.hint ?? "-"],
  },
  playerGameScores: {
    title: "Pontuações por jogo",
    searchPlaceholder: "Usuário, jogo ou pontos",
    fields: [
      {
        key: "playerId",
        label: "Usuário",
        type: "select",
        required: true,
        source: "players",
      },
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        required: true,
        source: "games",
      },
      { key: "points", label: "Pontos", type: "number" },
      { key: "attempts", label: "Tentativas", type: "number" },
      { key: "lastPlayedAt", label: "Última partida", type: "datetime" },
    ],
    emptyDraft: {
      playerId: "",
      gameId: "",
      points: 0,
      attempts: 0,
      lastPlayedAt: "",
    },
    renderColumns: (row) => [
      row.id,
      row.Player?.name ?? row.Player?.phone ?? row.playerId ?? "-",
      row.Game?.code ?? row.gameId ?? "-",
      row.points ?? 0,
      row.attempts ?? 0,
      formatDate(row.lastPlayedAt),
    ],
  },
  scoreEvents: {
    title: "Eventos de score",
    searchPlaceholder: "Usuário, jogo, pontos ou meta",
    fields: [
      {
        key: "playerId",
        label: "Usuário",
        type: "select",
        required: true,
        source: "players",
      },
      { key: "gameId", label: "Jogo", type: "select", source: "games" },
      { key: "points", label: "Pontos", type: "number" },
      { key: "timeBonus", label: "Bônus", type: "number" },
      { key: "meta", label: "Meta", type: "json" },
    ],
    emptyDraft: {
      playerId: "",
      gameId: "",
      points: 0,
      timeBonus: 0,
      meta: "{}",
    },
    renderColumns: (row) => [
      row.id,
      row.Player?.name ?? row.Player?.phone ?? row.playerId ?? "-",
      row.Game?.code ?? row.gameId ?? "-",
      row.points ?? 0,
      row.timeBonus ?? 0,
      stringify(row.meta),
    ],
  },
  gameSettings: {
    title: "Configurações",
    searchPlaceholder: "Chave, valor ou jogo",
    fields: [
      {
        key: "gameId",
        label: "Jogo",
        type: "select",
        required: true,
        source: "games",
      },
      { key: "key", label: "Chave", type: "text", required: true },
      { key: "value", label: "Valor", type: "json" },
    ],
    emptyDraft: { gameId: "", key: "", value: "{}" },
    renderColumns: (row) => [
      row.id,
      row.Game?.code ?? row.gameId ?? "-",
      row.key ?? "-",
      stringify(row.value),
    ],
  },
};

const GAME_CONFIG_DEFS = [
  {
    key: "timeLimitSeconds",
    label: "Tempo máximo (s)",
    type: "number",
    min: 10,
    max: 600,
    step: 10,
    defaultValue: 30,
    games: "all",
  },
  {
    key: "pointsToWin",
    label: "Pontos para ganhar",
    type: "number",
    min: 0,
    max: 1000,
    step: 10,
    defaultValue: 50,
    games: "all",
  },
  {
    key: "initialFallTimeSeconds",
    label: "Tempo inicial da queda (s)",
    type: "number",
    min: 3,
    max: 30,
    step: 1,
    defaultValue: 10,
    games: ["catch"],
  },
  {
    key: "pairCount",
    label: "Pares de cartas",
    type: "select",
    options: [4, 6, 8, 10, 12],
    defaultValue: 6,
    games: ["memory"],
  },
  {
    key: "gridSize",
    label: "Tamanho da grade",
    type: "select",
    options: [12, 16, 20, 25],
    defaultValue: 12,
    games: ["whac"],
  },
  {
    key: "gridSize",
    label: "Tamanho da grade",
    type: "select",
    options: [5, 8, 10, 12],
    defaultValue: 10,
    games: ["wordsearch", "wordsearch_mulher"],
  },
  {
    key: "wordLimit",
    label: "Qtd. de palavras",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 5,
    games: ["wordsearch", "wordsearch_mulher"],
  },
  {
    key: "wordLimitIsMin",
    label: "Quantidade minima",
    type: "checkbox",
    defaultValue: 0,
    games: ["wordsearch", "wordsearch_mulher"],
  },
  {
    key: "gridSize",
    label: "Tamanho do labirinto",
    type: "select",
    options: [8, 10],
    defaultValue: 8,
    games: ["labirinto"],
  },
  {
    key: "labirintoWordLength",
    label: "Qtd. de letras",
    type: "number",
    min: 3,
    max: 12,
    step: 1,
    defaultValue: 5,
    games: ["labirinto"],
  },
  {
    key: "labirintoWordLengthIsMin",
    label: "Quantidade minima",
    type: "checkbox",
    defaultValue: 0,
    games: ["labirinto"],
  },
  {
    key: "questionLimit",
    label: "Qtd. de perguntas",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 5,
    games: ["quiz", "quiz_mulher"],
  },
  {
    key: "soletraWordLimit",
    label: "Qtd. de palavras",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 3,
    games: ["soletra"],
  },
  {
    key: "soletraWordLimitIsMin",
    label: "Quantidade minima",
    type: "checkbox",
    defaultValue: 0,
    games: ["soletra"],
  },
  {
    key: "hangmanWordLength",
    label: "Qtd. de letras",
    type: "number",
    min: 3,
    max: 12,
    step: 1,
    defaultValue: 5,
    games: ["hangman"],
  },
  {
    key: "hangmanWordLengthIsMin",
    label: "Quantidade minima",
    type: "checkbox",
    defaultValue: 0,
    games: ["hangman"],
  },
];

const getGameConfigDefs = (code) =>
  GAME_CONFIG_DEFS.filter((def) =>
    def.games === "all" ? true : def.games.includes(code),
  );

const emitGameRulesChanged = (game) => {
  if (!game) return;
  try {
    window.dispatchEvent(
      new CustomEvent("app:gameRulesChanged", {
        detail: {
          gameCode: game.code,
          gameId: game.id,
        },
      }),
    );
  } catch (error) {}

  try {
    window.dispatchEvent(
      new CustomEvent("app:adminRecordsChanged", {
        detail: {
          resource: "gameSettings",
          gameCode: game.code,
          gameId: game.id,
        },
      }),
    );
  } catch (error) {}
};

/**
 * Formata strings de data ISO para o padrão brasileiro (pt-BR).
 */
const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString("pt-BR");
};

/**
 * Converte valores arbitrários (objetos, arrays, strings) em texto legível para exibição.
 */
const stringify = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "[objeto]";
  }
};

/**
 * Normaliza textos para busca (lowercase e sem espaços nas extremidades).
 */
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Converte strings numéricas em números reais ou retorna null se for inválido/vazio.
 */
const parseNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseSettingValue = (value) => {
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
};

const normalizeNumberValue = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

/**
 * Obtém e formata o valor inicial de um campo para o rascunho (draft) do formulário.
 */
const getDraftValue = (row, key) => {
  if (key === "hint") {
    let metaObj = row?.meta;
    if (typeof metaObj === "string" && metaObj.trim() !== "") {
      try {
        metaObj = JSON.parse(metaObj);
      } catch (e) {}
    }
    return metaObj?.hint || "";
  }
  const value = row?.[key];
  if (value === null || value === undefined) return "";
  if (key === "lastPlayedAt" && value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? ""
      : parsed.toISOString().slice(0, 16);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/**
 * Constrói o objeto de rascunho (draft) populando os campos com base no esquema e no registro atual.
 */
const buildDraft = (schema, row) => {
  const draft = { ...schema.emptyDraft };
  if (!row) return draft;
  schema.fields.forEach((field) => {
    draft[field.key] = getDraftValue(row, field.key);
  });

  // Preenchimento específico para opções de Quiz
  if (row.question !== undefined || row.options !== undefined) {
    let opts = [];
    if (Array.isArray(row.options)) {
      opts = row.options;
    } else if (typeof row.options === "string" && row.options.trim().startsWith("[")) {
      try {
        opts = JSON.parse(row.options);
      } catch (e) {}
    }

    if (opts.length > 0) {
      draft.option1 = opts[0] ?? "";
      draft.option2 = opts[1] ?? "";
      draft.option3 = opts[2] ?? "";
      draft.option4 = opts[3] ?? "";
      const foundIdx = opts.findIndex((o) => o === row.answer);
      draft.correctIndex = foundIdx >= 0 ? foundIdx : 0;
    } else if (row.answer) {
      draft.option1 = row.answer;
      draft.correctIndex = 0;
    }
  }

  return draft;
};

/**
 * Serializa os dados do rascunho (draft) de volta para os tipos esperados pela API REST.
 */
const serializeDraft = (schema, draft) => {
  const payload = {};
  schema.fields.forEach((field) => {
    const value = draft[field.key];
    if (field.key === "hint") {
      // Salva no objeto meta de forma aninhada
      payload.meta = {
        ...(payload.meta || {}),
        hint: value && String(value).trim() !== "" ? String(value).trim() : null
      };
      return;
    }
    if (field.type === "number") {
      payload[field.key] = parseNumberOrNull(value);
      return;
    }
    if (field.type === "datetime") {
      payload[field.key] = value ? new Date(value).toISOString() : null;
      return;
    }
    if (field.type === "json") {
      payload[field.key] = value === "" ? null : value;
      return;
    }
    if (field.type === "select") {
      payload[field.key] = parseNumberOrNull(value);
      return;
    }
    payload[field.key] = value;
  });

  // Tratamento de Quiz
  if (draft.question !== undefined) {
    const rawOptions = [draft.option1, draft.option2, draft.option3, draft.option4];
    const customOpts = rawOptions
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);

    if (customOpts.length >= 2) {
      const cIdx = Number(draft.correctIndex) || 0;
      const chosen = rawOptions[cIdx];
      payload.answer = chosen && String(chosen).trim() !== "" ? String(chosen).trim() : (customOpts[0] || draft.answer);
      payload.options = customOpts;
    } else if (draft.answer && String(draft.answer).trim()) {
      payload.answer = String(draft.answer).trim();
      payload.options = [String(draft.answer).trim()];
    }
  }

  return payload;
};

const getSearchText = (row) =>
  [
    row.id,
    row.name,
    row.phone,
    row.code,
    row.word,
    row.question,
    row.answer,
    row.hint,
    row.key,
    row.points,
    row.timeBonus,
    row.totalPoints,
    row.metadata,
    row.meta,
    row.options,
    row.value,
    row.Game?.name,
    row.Game?.code,
    row.Player?.name,
    row.Player?.phone,
  ]
    .map(normalize)
    .join(" ");

const filterRows = (rows, filters) => {
  const search = normalize(filters.search);
  const gameId = normalize(filters.gameId);
  const playerId = normalize(filters.playerId);

  return rows.filter((row) => {
    const rowGameId = normalize(row.gameId ?? row.Game?.id ?? row.GameId);
    const rowPlayerId = normalize(
      row.playerId ?? row.Player?.id ?? row.PlayerId,
    );

    if (gameId && rowGameId !== gameId) return false;
    if (playerId && rowPlayerId !== playerId) return false;
    if (!search) return true;
    return getSearchText(row).includes(search);
  });
};

/**
 * COMPONENTE MODAL DE FORMULÁRIO (AdminFormModal)
 * Exibe o formulário dinâmico para criação ou edição de registros, renderizando
 * campos de texto, números, seletores (selects), textareas, JSON e upload de imagens em base64.
 */
function AdminFormModal({
  open,
  title,
  resource,
  mode,
  draft,
  fields,
  sources,
  loading,
  error,
  onClose,
  onChange,
  onSubmit,
  selectedGame = {},
  onStartChallenge,
  onBackToMenu,
  onBackToCadastro,
}) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">{mode === "create" ? "Criar" : "Editar"}</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <form className="admin-form" onSubmit={onSubmit}>
          {resource === "quizQuestions" ? (
            <>
              {fields
                .filter((f) => f.type === "select")
                .map((field) => {
                  if (mode === "create" && draft[field.key] && draft[field.key] !== "") {
                    return null;
                  }
                  const options = sources[field.source] ?? [];
                  return (
                    <label className="time-field" key={field.key}>
                      <span>{field.label}</span>
                      <select
                        value={draft[field.key] ?? ""}
                        onChange={(event) => onChange(field.key, event.target.value)}
                        required={field.required}
                      >
                        <option value="">Selecione</option>
                        {options.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name ?? item.code ?? `#${item.id}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}

              <label className="time-field" style={{ gridColumn: "1 / -1" }}>
                <span>Pergunta (Individual)</span>
                <input
                  type="text"
                  value={draft.question ?? ""}
                  placeholder="Digite a pergunta"
                  onChange={(event) => onChange("question", event.target.value)}
                />
              </label>

              <div className="quiz-options-group">
                <h4 className="quiz-options-title">Opções de Resposta</h4>
                <p className="quiz-options-subtitle">
                  Preencha até 4 opções e marque o botão ao lado da alternativa correta. Se deixar as 4 opções vazias, o sistema usará o campo Resposta Certa abaixo e gerará distratores automaticamente das outras perguntas.
                </p>

                {[0, 1, 2, 3].map((idx) => (
                  <div className="quiz-option-row" key={idx}>
                    <label className="quiz-option-radio-label">
                      <input
                        type="radio"
                        name="correctQuizOption"
                        className="quiz-option-radio"
                        checked={Number(draft.correctIndex) === idx}
                        onChange={() => onChange("correctIndex", idx)}
                      />
                      <span>Opção {idx + 1} {Number(draft.correctIndex) === idx ? "(Correta)" : ""}</span>
                    </label>
                    <input
                      type="text"
                      className="quiz-option-input"
                      placeholder={`Texto da alternativa ${idx + 1}`}
                      value={draft[`option${idx + 1}`] ?? ""}
                      onChange={(event) => onChange(`option${idx + 1}`, event.target.value)}
                    />
                  </div>
                ))}

                <label className="time-field" style={{ marginTop: "8px" }}>
                  <span>Resposta Certa (Modo simples / fallback sem 4 opções)</span>
                  <input
                    type="text"
                    value={draft.answer ?? ""}
                    placeholder="Resposta correta simples"
                    onChange={(event) => onChange("answer", event.target.value)}
                  />
                </label>
              </div>

              <div className="time-field quiz-bulk-field">
                <span>Perguntas em Massa (Blocos de 5 linhas ou Separado por Vírgula)</span>
                <textarea
                  className="quiz-bulk-textarea"
                  value={draft.bulkQuestions ?? ""}
                  placeholder={`Formato Bloco de 5 Linhas (1 Pergunta + 4 Respostas, 1ª correta):\nQual é a capital do Brasil?\nBrasília\nSão Paulo\nRio de Janeiro\nSalvador\n\nQual é o maior planeta do sistema solar?\nJúpiter\nSaturno\nTerra\nMarte\n\nFormato por Linha (Separado por Vírgula):\nQual é a capital do Brasil?, Brasília, São Paulo, Rio de Janeiro, Salvador`}
                  onChange={(event) => onChange("bulkQuestions", event.target.value)}
                />
              </div>
            </>
          ) : (
            fields.map((field) => {
              if (
                mode === "create" &&
                field.type === "select" &&
                draft[field.key] &&
                draft[field.key] !== ""
              ) {
                return null;
              }

              if (field.key === "word" || field.key === "bulkWords") {
                const games = sources["games"] ?? [];
                const selectedGame = games.find(
                  (g) => String(g.id) === String(draft.gameId),
                );
                if (selectedGame?.code === "memory") return null;
              }

              if (field.type === "select") {
                const options = sources[field.source] ?? [];
                return (
                  <label className="time-field" key={field.key}>
                    <span>{field.label}</span>
                    <select
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      required={field.required}
                    >
                      <option value="">Selecione</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name ??
                            item.code ??
                            item.phone ??
                            item.word ??
                            item.question ??
                            `#${item.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              if (field.type === "json") {
                return (
                  <label className="time-field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea
                      rows={4}
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      placeholder="{} ou []"
                    />
                  </label>
                );
              }

              if (field.type === "datetime") {
                return (
                  <label className="time-field" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="datetime-local"
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                    />
                  </label>
                );
              }

              if (field.type === "textarea") {
                return (
                  <label className="time-field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      required={field.required}
                      style={{
                        minHeight: "80px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        padding: "10px",
                        borderRadius: "4px",
                      }}
                    />
                  </label>
                );
              }

              if (field.type === "image") {
                const games = sources["games"] ?? [];
                const selectedGame = games.find(
                  (g) => String(g.id) === String(draft.gameId),
                );

                if (resource === "words") {
                  if (selectedGame?.code !== "memory") return null;
                }

                return (
                  <label className="time-field" key={field.key}>
                    <span>{field.label}</span>
                    <div className="admin-image-upload">
                      {draft[field.key] && (
                        <div
                          className="admin-preview-container"
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          {(Array.isArray(draft[field.key])
                            ? draft[field.key]
                            : [draft[field.key]]
                          ).map((url, idx) => (
                            <img
                              key={idx}
                              src={
                                url.startsWith("data:") || url.startsWith("http")
                                  ? url
                                  : `${import.meta.env.VITE_DB_API_URL || ""}${url.startsWith("/") ? "" : "/"}${url}`
                              }
                              alt="Preview"
                              className="admin-preview-img"
                              style={{
                                width: "80px",
                                height: "80px",
                                objectFit: "contain",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "4px",
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple={
                          mode === "create" && selectedGame?.code === "memory"
                        }
                        onChange={async (event) => {
                          const files = Array.from(event.target.files);
                          if (files.length === 0) return;

                          const toBase64 = (file) =>
                            new Promise((resolve, reject) => {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = () => resolve(reader.result);
                              reader.onerror = (error) => reject(error);
                            });

                          try {
                            const base64Results = await Promise.all(
                              files.map(toBase64),
                            );
                            if (base64Results.length === 1) {
                              onChange(field.key, base64Results[0]);
                            } else {
                              onChange(field.key, base64Results);
                            }
                          } catch (err) {
                            alert("Erro ao processar imagens");
                          }
                        }}
                      />
                    </div>
                  </label>
                );
              }

              return (
                <label className="time-field" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={draft[field.key] ?? ""}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    required={field.required}
                  />
                </label>
              );
            })
          )}

          <div className="admin-form-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading
                ? "Salvando..."
                : mode === "create"
                  ? "Cadastrar"
                  : "Salvar alterações"}
            </button>
            <button className="ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * COMPONENTE DE SEÇÃO DE RECURSO PADRÃO (ResourceSection)
 * Renderiza a tabela de dados, barra de busca local, contagem de itens, barra de seleção em lote
 * e botões de ação (editar, excluir, novo registro) para entidades genéricas como Usuários e Jogos.
 */
function ResourceSection({
  resource,
  records,
  filters,
  selection,
  onToggleSelection,
  onSelectAllVisible,
  onClearSelection,
  onFilterChange,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
  isLimitActiveForGame,
  onToggleGameLimit,
}) {
  const schema = resourceSchemas[resource];
  const allRows = records?.[resource] ?? [];
  const visibleRows = filterRows(
    allRows,
    filters[resource] ?? { search: "", gameId: "", playerId: "" },
  );
  const selectedIds = selection[resource] ?? [];
  const visibleSelected = visibleRows.filter((row) =>
    selectedIds.includes(String(row.id)),
  );
  const allVisibleSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) => selectedIds.includes(String(row.id)));

  return (
    <section className="admin-section panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Banco de dados</p>
          <h2>{schema.title}</h2>
        </div>
        <div className="admin-section-actions">
          <span className="pill">{visibleRows.length} visíveis</span>
          <span className="pill">{selectedIds.length} selecionados</span>
          <button
            className="ghost"
            type="button"
            onClick={() => onSelectAllVisible(resource, visibleRows)}
          >
            {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              const codeMap = {
                quizQuestions: "quiz",
                soletraRounds: "soletra",
                labirintoRounds: "labirinto",
              };
              const gameCode = codeMap[resource];
              const game = gameCode
                ? (records.games ?? []).find((g) => g.code === gameCode)
                : null;
              onCreate(resource, game ? { gameId: game.id } : {});
            }}
          >
            Novo registro
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <label className="admin-filter admin-filter-wide">
          <span>Buscar</span>
          <input
            type="search"
            value={filters[resource]?.search ?? ""}
            placeholder={schema.searchPlaceholder}
            onChange={(event) =>
              onFilterChange(resource, "search", event.target.value)
            }
          />
        </label>
      </div>

      {selectedIds.length > 0 && (
        <div className="admin-selection-bar">
          <div className="admin-selection-summary">
            <span>{selectedIds.length} selecionado(s)</span>
            <div className="admin-selection-chips">
              {visibleSelected.slice(0, 6).map((row) => (
                <span className="admin-selection-chip" key={row.id}>
                  {row.name ??
                    row.code ??
                    row.word ??
                    row.question ??
                    row.prompt ??
                    row.phone ??
                    row.key ??
                    `#${row.id}`}
                </span>
              ))}
              {visibleSelected.length > 6 && (
                <span className="admin-selection-chip">
                  +{visibleSelected.length - 6}
                </span>
              )}
            </div>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => onClearSelection(resource)}
          >
            Limpar seleção
          </button>
          <button
            className="ghost danger"
            type="button"
            onClick={() => onDeleteSelected(resource, selectedIds)}
          >
            Excluir selecionados
          </button>
        </div>
      )}

      {visibleRows.length === 0 ? (
        <p className="muted">Nenhum registro encontrado.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-select-head">Selecionar</th>
                {resource === "players" && (
                  <>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Pontos</th>
                    <th>Criado em</th>
                  </>
                )}
                {resource === "games" && (
                  <>
                    <th>Código</th>
                    <th>Nome</th>
                    <th style={{ textAlign: "center" }}>1 jogada</th>
                  </>
                )}
                {resource === "quizQuestions" && (
                  <>
                    <th>Pergunta</th>
                    <th>Resposta</th>
                  </>
                )}
                {(resource === "soletraRounds" || resource === "labirintoRounds") && (
                  <>
                    <th>Palavra</th>
                    <th>Dica</th>
                  </>
                )}
                {resource === "playerGameScores" && (
                  <>
                    <th>Usuário</th>
                    <th>Jogo</th>
                    <th>Pontos</th>
                    <th>Tentativas</th>
                    <th>Última partida</th>
                  </>
                )}
                <th className="admin-actions-head">Ações</th>
              </tr>
            </thead>
            <tbody>
              {resource === "quizQuestions" && null}
              {visibleRows.map((row) => {
                const isSelected = selectedIds.includes(String(row.id));
                return (
                  <tr key={row.id} className={isSelected ? "is-selected" : ""}>
                    <td className="admin-select-cell">
                      <label className="admin-checkbox-wrap">
                        <input
                          type="checkbox"
                          className="admin-select-checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelection(resource, row.id)}
                          aria-label={`Selecionar registro ${row.id}`}
                        />
                        <span
                          className="admin-checkbox-box"
                          aria-hidden="true"
                        />
                      </label>
                    </td>
                    {resource === "games" ? (
                      <>
                        <td>{row.code ?? "-"}</td>
                        <td>{row.name ?? "-"}</td>
                        <td className="admin-select-cell">
                          <label className="admin-checkbox-wrap">
                            <input
                              type="checkbox"
                              className="admin-select-checkbox"
                              checked={isLimitActiveForGame?.(row.id) ?? false}
                              onChange={() =>
                                onToggleGameLimit?.(
                                  row.id,
                                  isLimitActiveForGame?.(row.id),
                                )
                              }
                              aria-label={`Travar 1 jogada para ${row.name}`}
                            />
                            <span
                              className="admin-checkbox-box"
                              aria-hidden="true"
                            />
                          </label>
                        </td>
                      </>
                    ) : (
                      schema
                        .renderColumns(row)
                        .slice(1)
                        .map((value, index) => (
                          <td key={`${row.id}-${index}`}>{value}</td>
                        ))
                    )}
                    <td className="admin-actions-cell">
                      <div className="admin-row-actions">
                        <button
                          className="ghost"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(resource, row);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="ghost danger"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(resource, row);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * COMPONENTE DE SEÇÃO DE PALAVRAS AGRUPADAS POR JOGO (WordsByGameSection)
 * Subdivide a exibição da tabela de palavras com base no jogo a que pertencem (Forca, Memória, Caça-Palavras, Labirinto).
 * Para o Jogo da Memória, exibe o preview das imagens cadastradas.
 */
function WordsByGameSection({
  records,
  selection,
  onToggleSelection,
  onSelectAllVisible,
  onClearSelection,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) {
  const allWords = records?.words ?? [];
  const games = records?.games ?? [];
  const selectedIds = selection.words ?? [];

  // Agrupar palavras por gameId
  const wordsByGame = new Map();
  for (const word of allWords) {
    const rawGid = word.gameId ?? word.Game?.id ?? "sem-jogo";
    const gid = rawGid !== "sem-jogo" ? String(rawGid) : rawGid;
    if (!wordsByGame.has(gid)) wordsByGame.set(gid, []);
    wordsByGame.get(gid).push(word);
  }

  // Jogos que utilizam a tabela de palavras
  const gamesThatUseWords = ["memory", "wordsearch", "hangman", "wordsearch_mulher"];

  // Garantir que os jogos que usam palavras apareçam, mesmo sem palavras cadastradas
  const sortedGames = [...games]
    .filter((g) => gamesThatUseWords.includes(g.code))
    .sort((a, b) =>
      (a.name ?? "").toLowerCase().localeCompare((b.name ?? "").toLowerCase()),
    );

  return (
    <>
      {sortedGames.map((game) => {
        const gameId = String(game.id);
        const words = wordsByGame.get(gameId) ?? [];
        const groupLabel = game.name ?? game.code ?? `#${gameId}`;

        return (
          <WordsGameTable
            key={gameId}
            gameId={gameId}
            gameLabel={groupLabel}
            isMemoryGame={game.code === "memory"}
            words={words}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            onSelectAllVisible={onSelectAllVisible}
            onClearSelection={onClearSelection}
            onCreate={onCreate}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteSelected={onDeleteSelected}
          />
        );
      })}

      {sortedGames.length === 0 && (
        <section className="admin-section panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Palavras</p>
              <h2>Nenhum jogo cadastrado</h2>
            </div>
          </div>
          <p className="muted">
            Cadastre jogos primeiro para adicionar palavras.
          </p>
        </section>
      )}
    </>
  );
}

/**
 * Tabela independente de palavras para UM jogo.
 * Cada instância tem seu próprio estado de busca local.
 */
function WordsGameTable({
  gameId,
  gameLabel,
  isMemoryGame,
  words,
  selectedIds,
  onToggleSelection,
  onSelectAllVisible,
  onClearSelection,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) {
  const [search, setSearch] = useState("");
  const [memorySubTab, setMemorySubTab] = useState("frente"); // "frente" | "verso"
  const [cardBack, setCardBack] = useState(() => getMemoryCardBack());
  const [backStatus, setBackStatus] = useState("");

  const handleCardBackUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("A imagem da parte de trás deve ter no máximo 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setCardBack(dataUrl);
      setMemoryCardBack(dataUrl);
      setBackStatus("Imagem da parte de trás atualizada com sucesso!");
      setTimeout(() => setBackStatus(""), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleCardBackRemove = () => {
    setCardBack(null);
    removeMemoryCardBack();
    setBackStatus("Verso padrão original restaurado.");
    setTimeout(() => setBackStatus(""), 4000);
  };

  const searchLower = search.trim().toLowerCase();
  const visibleWords = searchLower
    ? words.filter((row) => {
        const text = [row.id, row.word, row.meta]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ");
        return text.includes(searchLower);
      })
    : words;

  const visibleSelected = visibleWords.filter((row) =>
    selectedIds.includes(String(row.id)),
  );
  const allVisibleSelected =
    visibleWords.length > 0 &&
    visibleWords.every((row) => selectedIds.includes(String(row.id)));

  const groupSelectedIds = words
    .filter((row) => selectedIds.includes(String(row.id)))
    .map((row) => String(row.id));

  return (
    <section className="admin-section panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{isMemoryGame ? "Jogo da Memória" : "Palavras"}</p>
          <h2>{gameLabel}</h2>
        </div>
        {(!isMemoryGame || memorySubTab === "frente") && (
          <div className="admin-section-actions">
            <span className="pill">{visibleWords.length} visíveis</span>
            <span className="pill">{groupSelectedIds.length} selecionados</span>
            <button
              className="ghost"
              type="button"
              onClick={() => onSelectAllVisible("words", visibleWords)}
            >
              {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => onCreate("words", { gameId: Number(gameId) })}
            >
              Novo registro
            </button>
          </div>
        )}
      </div>

      {/* Navegação por abas exclusiva para o Jogo da Memória */}
      {isMemoryGame && (
        <div style={{ display: "flex", gap: "10px", margin: "14px 0 20px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "14px" }}>
          <button
            type="button"
            className={memorySubTab === "frente" ? "primary" : "ghost"}
            onClick={() => setMemorySubTab("frente")}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Fotos das Cartas (Frente)
          </button>
          <button
            type="button"
            className={memorySubTab === "verso" ? "primary" : "ghost"}
            onClick={() => setMemorySubTab("verso")}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            Parte de Trás das Fotos (Verso)
          </button>
        </div>
      )}

      {isMemoryGame && memorySubTab === "verso" ? (
        /* ABA DE PARTE DE TRÁS DAS FOTOS (VERSO) */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "10px 0" }}>
          <div>
            <h3 style={{ margin: "0 0 8px 0", color: "#f8fafc", fontSize: "18px" }}>
              Personalização da Parte de Trás das Fotos (Verso)
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              Adicione ou altere a estampa que aparece no verso de todas as cartas quando viradas para baixo no Jogo da Memória.
            </p>
          </div>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "30px",
            alignItems: "center",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "24px",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
          }}>
            {/* Visualizador da Carta com o Verso */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "173px",
                  height: "173px",
                  borderRadius: "20px",
                  backgroundImage: cardBack ? `url("${cardBack}")` : 'url("/images/memory/card-back-default.svg")',
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                  border: "2px solid rgba(255, 255, 255, 0.25)",
                }}
              />
              <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
                {cardBack ? "Verso Personalizado Ativo" : "Verso Padrão Original"}
              </span>
            </div>

            {/* Controles de Upload e Remoção */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: "1", minWidth: "260px" }}>
              <label
                className="primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  width: "fit-content",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Carregar Imagem da Parte de Trás
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleCardBackUpload}
                  style={{ display: "none" }}
                />
              </label>

              {cardBack && (
                <button
                  type="button"
                  className="ghost btn-danger"
                  onClick={handleCardBackRemove}
                  style={{ width: "fit-content", display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  Restaurar Verso Padrão
                </button>
              )}

              <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: "1.4" }}>
                Formato recomendado: Imagem quadrada (ex: 500x500 px), formato PNG, JPG ou WebP de até 3 MB.
              </p>

              {backStatus && (
                <div style={{ color: "#38bdf8", fontWeight: "600", fontSize: "14px" }}>
                  {backStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ABA DE FOTOS DA FRENTE (CARTAS) */
        <>
          <div className="admin-filters">
            <label className="admin-filter admin-filter-wide">
              <span>Buscar</span>
              <input
                type="search"
                value={search}
                placeholder="Palavra ou meta"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {groupSelectedIds.length > 0 && (
            <div className="admin-selection-bar">
              <div className="admin-selection-summary">
                <span>{groupSelectedIds.length} selecionado(s)</span>
                <div className="admin-selection-chips">
                  {visibleSelected.slice(0, 6).map((row) => (
                    <span className="admin-selection-chip" key={row.id}>
                      {row.word ?? `#${row.id}`}
                    </span>
                  ))}
                  {visibleSelected.length > 6 && (
                    <span className="admin-selection-chip">
                      +{visibleSelected.length - 6}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="ghost"
                type="button"
                onClick={() => onClearSelection("words")}
              >
                Limpar seleção
              </button>
              <button
                className="ghost danger"
                type="button"
                onClick={() => onDeleteSelected("words", groupSelectedIds)}
              >
                Excluir selecionados
              </button>
            </div>
          )}

          {visibleWords.length === 0 ? (
            <p className="muted">Nenhum registro encontrado.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-select-head">Selecionar</th>
                    <th>ID</th>
                    {!isMemoryGame && <th>Palavra</th>}
                    {isMemoryGame && <th>Imagem</th>}
                    <th className="admin-actions-head">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleWords.map((row) => {
                    const isSelected = selectedIds.includes(String(row.id));
                    return (
                      <tr key={row.id} className={isSelected ? "is-selected" : ""}>
                        <td className="admin-select-cell">
                          <label className="admin-checkbox-wrap">
                            <input
                              type="checkbox"
                              className="admin-select-checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelection("words", row.id)}
                              aria-label={`Selecionar registro ${row.id}`}
                            />
                            <span
                              className="admin-checkbox-box"
                              aria-hidden="true"
                            />
                          </label>
                        </td>
                        <td>{row.id}</td>
                        {!isMemoryGame && <td>{row.word ?? "-"}</td>}
                        {isMemoryGame && (
                          <td>
                            {row.imageUrl ? (
                              <img
                                src={
                                  row.imageUrl?.startsWith("data:") ||
                                  row.imageUrl?.startsWith("http")
                                    ? row.imageUrl
                                    : row.imageUrl?.length > 100
                                      ? `data:image/png;base64,${row.imageUrl}`
                                      : `${import.meta.env.VITE_DB_API_URL || ""}${row.imageUrl?.startsWith("/") ? "" : "/"}${row.imageUrl}`
                                }
                                alt="preview"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                        )}
                        <td className="admin-actions-cell">
                          <div className="admin-row-actions">
                            <button
                              className="ghost"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEdit("words", row);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="ghost danger"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete("words", row);
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * COMPONENTE DE SEÇÃO DE PERGUNTAS DO QUIZ AGRUPADAS POR JOGO (QuizByGameSection)
 * Exibe uma tabela por jogo que usa quizQuestions (quiz, quiz_mulher, etc.).
 */
function QuizByGameSection({
  records,
  selection,
  onToggleSelection,
  onSelectAllVisible,
  onClearSelection,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) {
  const allQuestions = records?.quizQuestions ?? [];
  const games = records?.games ?? [];

  // Agrupar perguntas por gameId
  const questionsByGame = new Map();
  for (const q of allQuestions) {
    const rawGid = q.gameId ?? q.Game?.id ?? "sem-jogo";
    const gid = rawGid !== "sem-jogo" ? String(rawGid) : rawGid;
    if (!questionsByGame.has(gid)) questionsByGame.set(gid, []);
    questionsByGame.get(gid).push(q);
  }

  const gamesThatUseQuiz = ["quiz", "quiz_mulher"];

  const sortedGames = [...games]
    .filter((g) => gamesThatUseQuiz.includes(g.code))
    .sort((a, b) =>
      (a.name ?? "").toLowerCase().localeCompare((b.name ?? "").toLowerCase()),
    );

  return (
    <>
      {sortedGames.map((game) => {
        const gameId = String(game.id);
        const questions = questionsByGame.get(gameId) ?? [];
        const groupLabel = game.name ?? game.code ?? `#${gameId}`;

        return (
          <QuizGameTable
            key={gameId}
            gameId={gameId}
            gameLabel={groupLabel}
            questions={questions}
            selectedIds={selection.quizQuestions ?? []}
            onToggleSelection={onToggleSelection}
            onSelectAllVisible={onSelectAllVisible}
            onClearSelection={onClearSelection}
            onCreate={onCreate}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteSelected={onDeleteSelected}
          />
        );
      })}

      {sortedGames.length === 0 && (
        <section className="admin-section panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Perguntas do Quiz</p>
              <h2>Nenhum jogo cadastrado</h2>
            </div>
          </div>
          <p className="muted">
            Cadastre jogos primeiro para adicionar perguntas.
          </p>
        </section>
      )}
    </>
  );
}

/**
 * Tabela independente de perguntas do quiz para UM jogo.
 */
function QuizGameTable({
  gameId,
  gameLabel,
  questions,
  selectedIds,
  onToggleSelection,
  onSelectAllVisible,
  onClearSelection,
  onCreate,
  onEdit,
  onDelete,
  onDeleteSelected,
}) {
  const [search, setSearch] = useState("");

  const searchLower = search.trim().toLowerCase();
  const visibleQuestions = searchLower
    ? questions.filter((row) => {
        const text = [row.id, row.question, row.answer, row.prompt]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ");
        return text.includes(searchLower);
      })
    : questions;

  const visibleSelected = visibleQuestions.filter((row) =>
    selectedIds.includes(String(row.id)),
  );
  const allVisibleSelected =
    visibleQuestions.length > 0 &&
    visibleQuestions.every((row) => selectedIds.includes(String(row.id)));

  const groupSelectedIds = questions
    .filter((row) => selectedIds.includes(String(row.id)))
    .map((row) => String(row.id));

  return (
    <section className="admin-section panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Perguntas do Quiz</p>
          <h2>{gameLabel}</h2>
        </div>
        <div className="admin-section-actions">
          <span className="pill">{visibleQuestions.length} visíveis</span>
          <span className="pill">{groupSelectedIds.length} selecionados</span>
          <button
            className="ghost"
            type="button"
            onClick={() => onSelectAllVisible("quizQuestions", visibleQuestions)}
          >
            {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => onCreate("quizQuestions", { gameId: Number(gameId) })}
          >
            Novo registro
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <label className="admin-filter admin-filter-wide">
          <span>Buscar</span>
          <input
            type="search"
            value={search}
            placeholder="Pergunta ou resposta"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {groupSelectedIds.length > 0 && (
        <div className="admin-selection-bar">
          <div className="admin-selection-summary">
            <span>{groupSelectedIds.length} selecionado(s)</span>
            <div className="admin-selection-chips">
              {visibleSelected.slice(0, 6).map((row) => (
                <span className="admin-selection-chip" key={row.id}>
                  {row.question ?? row.prompt ?? `#${row.id}`}
                </span>
              ))}
              {visibleSelected.length > 6 && (
                <span className="admin-selection-chip">
                  +{visibleSelected.length - 6}
                </span>
              )}
            </div>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => onClearSelection("quizQuestions")}
          >
            Limpar seleção
          </button>
          <button
            className="ghost danger"
            type="button"
            onClick={() => onDeleteSelected("quizQuestions", groupSelectedIds)}
          >
            Excluir selecionados
          </button>
        </div>
      )}

      {visibleQuestions.length === 0 ? (
        <p className="muted">Nenhum registro encontrado.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-select-head">Selecionar</th>
                <th>ID</th>
                <th>Pergunta</th>
                <th>Resposta</th>
                <th>Alternativas</th>
                <th className="admin-actions-head">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuestions.map((row) => {
                const isSelected = selectedIds.includes(String(row.id));
                let optsCount = 0;
                if (Array.isArray(row.options)) {
                  optsCount = row.options.length;
                } else if (typeof row.options === "string" && row.options.trim().startsWith("[")) {
                  try {
                    const parsed = JSON.parse(row.options);
                    if (Array.isArray(parsed)) optsCount = parsed.length;
                  } catch (e) {}
                }
                return (
                  <tr key={row.id} className={isSelected ? "is-selected" : ""}>
                    <td className="admin-select-cell">
                      <label className="admin-checkbox-wrap">
                        <input
                          type="checkbox"
                          className="admin-select-checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelection("quizQuestions", row.id)}
                          aria-label={`Selecionar registro ${row.id}`}
                        />
                        <span
                          className="admin-checkbox-box"
                          aria-hidden="true"
                        />
                      </label>
                    </td>
                    <td>{row.id}</td>
                    <td>{row.question ?? row.prompt ?? "-"}</td>
                    <td>{row.answer ?? "-"}</td>
                    <td>{optsCount >= 2 ? `${optsCount} opções` : "Automático"}</td>
                    <td className="admin-actions-cell">
                      <div className="admin-row-actions">
                        <button
                          className="ghost"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit("quizQuestions", row);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="ghost danger"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete("quizQuestions", row);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * COMPONENTE PRINCIPAL DO PAINEL DE ADMINISTRAÇÃO (AdminHub)
 * Centraliza o carregamento de todos os registros via API REST, gerencia o estado global dos filtros,
 * seleções em lote, controle do modal de formulários e acionamento das requisições CRUD.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {Function} props.onBackToMenu - Callback para retornar ao menu principal da aplicação.
 */
export default function AdminHub({ onBackToMenu, onBackToCadastro, onOpenDashboard }) {
  const [activeTab, setActiveTab] = useState("dados"); // "dados" | "personalizacao"
  const [records, setRecords] = useState(null); // Dados de todas as tabelas vindos da API
  const [loading, setLoading] = useState(true); // Flag de carregamento inicial
  const [error, setError] = useState(""); // Mensagem de erro global
  const [filters, setFilters] = useState({}); // Filtros de busca por recurso
  const [selection, setSelection] = useState({}); // IDs selecionados por recurso (para ações em lote)
  const [modalState, setModalState] = useState({
    // Controle do modal de formulário
    open: false,
    mode: "create",
    resource: null,
    rowId: null,
    draft: {},
  });
  const [modalError, setModalError] = useState(""); // Mensagem de erro do modal
  const [saving, setSaving] = useState(false); // Flag de salvamento em andamento
  const [gameConfigDrafts, setGameConfigDrafts] = useState({});
  const [gameConfigSaving, setGameConfigSaving] = useState({});
  const [gameConfigError, setGameConfigError] = useState("");

  // Função para carregar e atualizar todos os registros do banco de dados via API
  const loadRecords = async () => {
    // Só mostra loading na primeira carga; refreshes são silenciosos
    if (!records) setLoading(true);
    setError("");
    try {
      const data = await getAdminRecords();
      setRecords(data);
    } catch (err) {
      setError("Não foi possível carregar os registros do banco.");
    } finally {
      setLoading(false);
    }
  };

  // Aplica o valor padrão de 30s para `timeLimitSeconds` em todos os jogos.
  // Cria ou atualiza registros em `gameSettings` conforme necessário.
  const resetAllTimeLimits = async () => {
    if (!records) return;
    const confirmed = window.confirm(
      "Tem certeza? Isso substituirá o tempo de todos os jogos para 30 segundos.",
    );
    if (!confirmed) return;

    setGameConfigSaving((prev) => ({ ...prev, globalReset: true }));
    setGameConfigError("");

    try {
      const settings = records.gameSettings ?? [];
      for (const game of records.games ?? []) {
        const defs = getGameConfigDefs(game.code);
        if (!defs.some((d) => d.key === "timeLimitSeconds")) continue;
        const gameId = String(game.id);

        const existing = settings.find(
          (row) =>
            String(row.gameId ?? row.Game?.id) === gameId &&
            String(row.key) === "timeLimitSeconds",
        );

        const payload = {
          gameId: Number(game.id),
          key: "timeLimitSeconds",
          value: 30,
        };

        if (existing?.id) {
          await updateAdminRecord("gameSettings", existing.id, payload);
        } else {
          const created = await createAdminRecord("gameSettings", payload);
        }

        emitGameRulesChanged(game);

        // atualiza rascunho local imediato para refletir 30s no UI
        setGameConfigDrafts((current) => ({
          ...current,
          [gameId]: {
            ...(current[gameId] ?? {}),
            timeLimitSeconds: 30,
          },
        }));
      }

      await loadRecords();
    } catch (err) {
      setGameConfigError(
        "Não foi possível aplicar o padrão 30s a todos os jogos.",
      );
    } finally {
      setGameConfigSaving((prev) => ({ ...prev, globalReset: false }));
    }
  };

  const setLimitAllAttempts = async (value) => {
    if (!records) return;
    const actionText =
      value === 1
        ? "bloquear todos os jogos para apenas 1 jogada por pessoa"
        : "liberar jogadas ilimitadas para todos os jogos";
    const confirmed = window.confirm(`Tem certeza? Isso irá ${actionText}.`);
    if (!confirmed) return;

    setGameConfigSaving((prev) => ({ ...prev, globalReset: true }));
    setGameConfigError("");

    try {
      const settings = records.gameSettings ?? [];
      for (const game of records.games ?? []) {
        const gameId = String(game.id);

        const existing = settings.find(
          (row) =>
            String(row.gameId ?? row.Game?.id) === gameId &&
            String(row.key) === "limitOneAttempt",
        );

        const payload = {
          gameId: Number(game.id),
          key: "limitOneAttempt",
          value: value,
        };

        if (existing?.id) {
          await updateAdminRecord("gameSettings", existing.id, payload);
        } else {
          await createAdminRecord("gameSettings", payload);
        }

        emitGameRulesChanged(game);

        // atualiza rascunho local imediato para refletir no UI
        setGameConfigDrafts((current) => ({
          ...current,
          [gameId]: {
            ...(current[gameId] ?? {}),
            limitOneAttempt: value,
          },
        }));
      }

      await loadRecords();
    } catch (err) {
      setGameConfigError(
        "Não foi possível alterar a trava de jogadas para todos os jogos.",
      );
    } finally {
      setGameConfigSaving((prev) => ({ ...prev, globalReset: false }));
    }
  };

  const isLimitActiveForGame = (gameId) => {
    if (!records) return false;
    const settings = records.gameSettings ?? [];
    const setting = settings.find(
      (row) =>
        String(row.gameId ?? row.Game?.id) === String(gameId) &&
        String(row.key) === "limitOneAttempt",
    );
    const storedValue = parseSettingValue(setting?.value);
    return Number(storedValue) === 1 || storedValue === true || String(storedValue) === "true";
  };

  const handleToggleGameLimit = async (gameId, currentValue) => {
    if (!records) return;
    const nextValue = currentValue ? 0 : 1;

    try {
      const settings = records.gameSettings ?? [];
      const game = (records.games ?? []).find(
        (g) => String(g.id) === String(gameId),
      );
      if (!game) return;

      const existing = settings.find(
        (row) =>
          String(row.gameId ?? row.Game?.id) === String(gameId) &&
          String(row.key) === "limitOneAttempt",
      );

      const payload = {
        gameId: Number(gameId),
        key: "limitOneAttempt",
        value: nextValue,
      };

      if (existing?.id) {
        await updateAdminRecord("gameSettings", existing.id, payload);
      } else {
        await createAdminRecord("gameSettings", payload);
      }

      emitGameRulesChanged(game);

      // atualiza rascunho local imediato
      setGameConfigDrafts((current) => ({
        ...current,
        [gameId]: {
          ...(current[gameId] ?? {}),
          limitOneAttempt: nextValue,
        },
      }));

      await loadRecords();
    } catch (err) {
      alert("Não foi possível alterar a trava de jogada para este jogo.");
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (!records) return;

    const settings = records.gameSettings ?? [];
    setGameConfigDrafts((current) => {
      const next = { ...current };
      (records.games ?? []).forEach((game) => {
        const defs = getGameConfigDefs(game.code);
        if (defs.length === 0) return;
        const gameId = String(game.id);
        const existing = next[gameId] ?? {};
        const updated = { ...existing };

        defs.forEach((def) => {
          const setting = settings.find(
            (row) =>
              String(row.gameId ?? row.Game?.id) === gameId &&
              String(row.key) === def.key,
          );
          const storedValue = parseSettingValue(setting?.value);
          if (updated[def.key] === undefined) {
            updated[def.key] =
              storedValue !== undefined ? storedValue : def.defaultValue;
          }
        });

        next[gameId] = updated;
      });

      return next;
    });
  }, [records]);

  useEffect(() => {
    if (!records) return;

    setFilters((current) => {
      const next = { ...current };
      resourceOrder.forEach((resource) => {
        if (!next[resource])
          next[resource] = { search: "", gameId: "", playerId: "" };
      });
      return next;
    });
  }, [records]);

  useEffect(() => {
    if (!records) return;

    setSelection((current) => {
      const next = {};
      resourceOrder.forEach((resource) => {
        const validIds = new Set(
          (records[resource] ?? []).map((row) => String(row.id)),
        );
        next[resource] = (current[resource] ?? []).filter((id) =>
          validIds.has(id),
        );
      });
      return next;
    });
  }, [records]);

  const sources = useMemo(
    () => ({ games: records?.games ?? [], players: records?.players ?? [] }),
    [records],
  );

  const handleGameConfigChange = (gameId, key, value) => {
    setGameConfigDrafts((current) => ({
      ...current,
      [gameId]: {
        ...(current[gameId] ?? {}),
        [key]: value,
      },
    }));
  };

  const saveGameConfig = async (game) => {
    const defs = getGameConfigDefs(game.code);
    if (defs.length === 0) return;

    const gameId = String(game.id);
    const currentDraft = gameConfigDrafts[gameId] ?? {};
    const settings = records?.gameSettings ?? [];

    setGameConfigSaving((prev) => ({ ...prev, [gameId]: true }));
    setGameConfigError("");

    try {
      for (const def of defs) {
        const rawValue = currentDraft[def.key];
        const fallback = def.defaultValue;
        const resolvedValue =
          rawValue === undefined || rawValue === null || rawValue === ""
            ? fallback
            : rawValue;
        const normalizedValue =
          def.type === "checkbox"
            ? (resolvedValue ? 1 : 0)
            : def.type === "number" || def.type === "select"
              ? normalizeNumberValue(resolvedValue, fallback)
              : resolvedValue;

        const existing = settings.find(
          (row) =>
            String(row.gameId ?? row.Game?.id) === gameId &&
            String(row.key) === def.key,
        );

        const payload = {
          gameId: Number(game.id),
          key: def.key,
          value: normalizedValue,
        };

        if (existing?.id) {
          await updateAdminRecord("gameSettings", existing.id, payload);
        } else {
          await createAdminRecord("gameSettings", payload);
        }
      }

      await loadRecords();
      emitGameRulesChanged(game);
    } catch (err) {
      setGameConfigError("Não foi possível salvar as configurações.");
    } finally {
      setGameConfigSaving((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  const updateFilter = (resource, key, value) => {
    setFilters((current) => ({
      ...current,
      [resource]: {
        ...(current[resource] ?? { search: "", gameId: "", playerId: "" }),
        [key]: value,
      },
    }));
  };

  const toggleSelection = (resource, rowId) => {
    const id = String(rowId);
    setSelection((current) => {
      const currentRows = current[resource] ?? [];
      return {
        ...current,
        [resource]: currentRows.includes(id)
          ? currentRows.filter((value) => value !== id)
          : [...currentRows, id],
      };
    });
  };

  const selectAllVisible = (resource, rows) => {
    const visibleIds = rows.map((row) => String(row.id));
    setSelection((current) => {
      const currentRows = current[resource] ?? [];
      const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => currentRows.includes(id));
      return {
        ...current,
        [resource]: allVisibleSelected
          ? currentRows.filter((id) => !visibleIds.includes(id))
          : Array.from(new Set([...currentRows, ...visibleIds])),
      };
    });
  };

  const clearSelection = (resource) => {
    setSelection((current) => ({ ...current, [resource]: [] }));
  };

  const openCreate = (resource, defaults = {}) => {
    const schema = resourceSchemas[resource];
    setModalError("");
    setModalState({
      open: true,
      mode: "create",
      resource,
      rowId: null,
      draft: { ...schema.emptyDraft, ...defaults },
    });
  };

  const openEdit = (resource, row) => {
    const schema = resourceSchemas[resource];
    setModalError("");
    setModalState({
      open: true,
      mode: "edit",
      resource,
      rowId: row.id,
      draft: buildDraft(schema, row),
    });
  };

  const closeModal = () => {
    setModalState((current) => ({ ...current, open: false }));
    setModalError("");
  };

  const updateDraft = (key, value) => {
    setModalState((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
    }));
  };

  const submitModal = async (event) => {
    event.preventDefault();
    if (!modalState.resource) return;

    setSaving(true);
    setModalError("");
    try {
      const schema = resourceSchemas[modalState.resource];
      const payload = serializeDraft(schema, modalState.draft);

      const games = sources["games"] ?? [];
      const selectedGame = games.find(
        (g) => String(g.id) === String(modalState.draft.gameId),
      );
      const isMemory =
        modalState.resource === "words" && selectedGame?.code === "memory";

      // Validação extra para o recurso de palavras
      if (modalState.resource === "words") {
        if (isMemory) {
          if (
            !payload.imageUrl ||
            (Array.isArray(payload.imageUrl) && payload.imageUrl.length === 0)
          ) {
            setModalError("Por favor, selecione ao menos uma imagem.");
            setSaving(false);
            return;
          }
          // Deixa vazio para o Jogo da Memória
          if (!payload.word) payload.word = "";
        } else if (!payload.word && !payload.bulkWords) {
          setModalError("Por favor, digite ao menos uma palavra.");
          setSaving(false);
          return;
        }
      }

      if (modalState.resource === "quizQuestions") {
        if (!payload.question && !payload.bulkQuestions) {
          setModalError("Por favor, digite ao menos uma pergunta.");
          setSaving(false);
          return;
        }
      }

      if (modalState.resource === "soletraRounds" || modalState.resource === "labirintoRounds") {
        if (!payload.word && !payload.bulkRounds) {
          setModalError("Por favor, digite ao menos uma palavra.");
          setSaving(false);
          return;
        }
      }

      if (modalState.mode === "create") {
        if (
          modalState.resource === "words" &&
          Array.isArray(payload.imageUrl)
        ) {
          const bulkPayload = payload.imageUrl.map((url) => ({
            ...payload,
            imageUrl: url,
          }));
          await createAdminRecord(modalState.resource, bulkPayload);
        } else {
          await createAdminRecord(modalState.resource, payload);
        }
      } else {
        await updateAdminRecord(modalState.resource, modalState.rowId, payload);
      }
      await loadRecords();
      closeModal();
    } catch (err) {
      setModalError("Não foi possível salvar o registro.");
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (resource, row) => {
    const confirmed = window.confirm(`Excluir o registro #${row.id}?`);
    if (!confirmed) return;

    try {
      await deleteAdminRecord(resource, row.id);
      await loadRecords();
    } catch (err) {
      setError("Não foi possível excluir o registro.");
    }
  };

  const removeSelectedRecords = async (resource, ids) => {
    if (!ids || ids.length === 0) return;
    const confirmed = window.confirm(
      `Excluir ${ids.length} registro(s) selecionado(s)?`,
    );
    if (!confirmed) return;

    try {
      for (const id of ids) {
        await deleteAdminRecord(resource, id);
      }
      clearSelection(resource);
      await loadRecords();
    } catch (err) {
      setError("Não foi possível excluir alguns registros.");
      await loadRecords();
    }
  };

  return (
    <>
      <GameNav
        currentScreen="admin"
        onBackToMenu={onBackToMenu}
        onBackToCadastro={onBackToCadastro}
        onOpenDashboard={onOpenDashboard}
      />
      <section className="admin-hub">
      {/*
        HEADER: área superior do painel administrativo.
      */}
      <header className="panel admin-hero">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Administração</p>
            <h2>Painel Administrativo</h2>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${activeTab === "dados" ? " active" : ""}`}
            onClick={() => setActiveTab("dados")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            Dados
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "personalizacao" ? " active" : ""}`}
            onClick={() => setActiveTab("personalizacao")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
            Personalização
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "seguranca" ? " active" : ""}`}
            onClick={() => setActiveTab("seguranca")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Segurança
          </button>
        </div>

        {loading && activeTab === "dados" && <p className="muted">Carregando registros...</p>}
        {error && activeTab === "dados" && <p className="admin-error">{error}</p>}
      </header>

      {activeTab === "seguranca" && (
        <div className="admin-sections">
          <AdminSecurity />
        </div>
      )}

      {activeTab === "personalizacao" && (
        <div className="admin-sections">
          <Personalizacao />
        </div>
      )}

      {activeTab === "dados" && records && (
        <div className="admin-sections">
          {/*
            SEÇÃO: Configurações por jogo
            - Apresenta um cartão por jogo com os campos de configuração (usando `CardMenu`)
            - Cada cartão contém inputs compactos e botão "Salvar" que persiste via API
          */}
          <section className="admin-section panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Configurações</p>
                <h2>Regras por jogo</h2>
              </div>
              <div className="admin-section-actions">
                <button className="ghost" type="button" onClick={loadRecords}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Recarregar
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={async () => await resetAllTimeLimits?.()}
                  disabled={!!gameConfigSaving.globalReset}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Aplicar padrão 30s
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={async () => await setLimitAllAttempts?.(1)}
                  disabled={!!gameConfigSaving.globalReset}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Travar 1 jogada em todos
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={async () => await setLimitAllAttempts?.(0)}
                  disabled={!!gameConfigSaving.globalReset}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  Liberar jogadas em todos
                </button>
              </div>
            </div>

            {gameConfigError && (
              <p className="admin-error">{gameConfigError}</p>
            )}

            <div className="admin-game-rules-grid">
              {(records.games ?? []).map((game) => {
                const defs = getGameConfigDefs(game.code);
                if (defs.length === 0) return null;
                const gameId = String(game.id);
                const draft = gameConfigDrafts[gameId] ?? {};

                return (
                  <CardMenu
                    key={game.id}
                    title={game.name ?? game.code}
                    code={game.code}
                    interactive={false}
                    showButton={false}
                    configDefs={defs}
                    configDraft={draft}
                    isAdm={true}
                    onConfigChange={(key, value) =>
                      handleGameConfigChange(gameId, key, value)
                    }
                    onConfigSave={() => saveGameConfig(game)}
                    configSaving={gameConfigSaving[gameId]}
                  />
                );
              })}
            </div>
          </section>

          {/*
            SEÇÕES DINÂMICAS: Para cada recurso definido em `resourceOrder` exibimos
            uma tabela/visualização apropriada. `words` recebe uma seção agrupada por jogo.
          */}
          {resourceOrder.map((resource) =>
            resource === "words" ? (
              <WordsByGameSection
                key="words"
                records={records}
                selection={selection}
                onToggleSelection={toggleSelection}
                onSelectAllVisible={selectAllVisible}
                onClearSelection={clearSelection}
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={removeRecord}
                onDeleteSelected={removeSelectedRecords}
              />
            ) : resource === "quizQuestions" ? (
              <QuizByGameSection
                key="quizQuestions"
                records={records}
                selection={selection}
                onToggleSelection={toggleSelection}
                onSelectAllVisible={selectAllVisible}
                onClearSelection={clearSelection}
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={removeRecord}
                onDeleteSelected={removeSelectedRecords}
              />
            ) : (
              <ResourceSection
                key={resource}
                resource={resource}
                records={records}
                filters={filters}
                selection={selection}
                onToggleSelection={toggleSelection}
                onSelectAllVisible={selectAllVisible}
                onClearSelection={clearSelection}
                onFilterChange={updateFilter}
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={removeRecord}
                onDeleteSelected={removeSelectedRecords}
                isLimitActiveForGame={isLimitActiveForGame}
                onToggleGameLimit={handleToggleGameLimit}
              />
            ),
          )}
        </div>
      )}

      <div className="panel admin-actions">
        <button className="primary" type="button" onClick={loadRecords}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Atualizar registros
        </button>
      </div>

      <AdminFormModal
        open={modalState.open}
        title={
          modalState.resource
            ? resourceSchemas[modalState.resource].title
            : "Registro"
        }
        resource={modalState.resource}
        mode={modalState.mode}
        draft={modalState.draft}
        fields={
          modalState.resource ? resourceSchemas[modalState.resource].fields : []
        }
        sources={sources}
        loading={saving}
        error={modalError}
        onClose={closeModal}
        onChange={updateDraft}
        onSubmit={submitModal}
      />
    </section>
    </>
  );
}
