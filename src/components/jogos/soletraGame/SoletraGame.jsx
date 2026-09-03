import useSoletraGameLogic from "./useSoletraGameLogic";
import "./soletraGame.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { wholeSeconds } from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * COMPONENTE VISUAL DO JOGO SOLETRA (SoletraGame.jsx)
 * Responsável exclusivamente pela renderização da interface gráfica (View), exibindo o cabeçalho
 * com HUD reativo, a lista de palavras-alvo (com suas respectivas dicas e níveis de revelação),
 * os slots das letras digitadas, a colmeia interativa em formato hexagonal e o modal final de resultado.
 *
 * @param {Object} props - Propriedades recebidas do componente orquestrador (App).
 * @param {Object} props.data - Dados brutos da rodada vindos da API REST (ex: `roundData.exemplos`).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`, `wordLimit`).
 * @param {Array} props.ranking - Lista de top jogadores para exibição no mini-ranking final.
 * @param {Function} props.onScore - Callback acionada ao finalizar a partida para registrar a pontuação.
 * @param {Function} props.onRoundComplete - Callback acionada ao encontrar todas as palavras com sucesso.
 * @param {Function} props.onGameOver - Callback acionada quando o tempo da partida se esgota.
 */
export default function SoletraGame({
  data = {},
  config = {},
  settings = {},
  ranking = [],
  onScore,
  onRoundComplete,
  onGameOver,
  headerProps = {},
}) {
  const activeSettings = { ...config, ...settings };
  // Desestrutura o Custom Hook que gerencia todo o estado, validação e regras de negócio do Soletra
  const {
    MAX_HINTS_PER_WORD, // Limite máximo de dicas/letras reveladas por palavra (padrão: 3)
    targets, // Lista de alvos ativos
    honeycomb, // Array contendo as 7 letras exclusivas disponíveis na colmeia
    typedChars, // Array de caracteres atualmente digitados pelo usuário
    foundIndexes, // Conjunto (Set) contendo os índices das palavras já adivinhadas
    hintLevels, // Array com o número de dicas utilizadas para cada palavra
    activeWordLength, // Comprimento da palavra-alvo atual
    totalWords, // Quantidade total de palavras na rodada
    timeLeft, // Tempo restante no cronômetro regressivo
    finished, // Flag indicando se a rodada foi encerrada
    timedOut, // Flag indicando se o encerramento ocorreu por esgotamento do tempo
    feedback, // Mensagem textual de feedback (ex: "Acertou!", "Palavra já encontrada")
    lastAttemptColors, // Array de classes CSS indicando o status de cada letra da última tentativa
    currentPoints, // Pontuação atual acumulada
    pushLetter, // Função para adicionar uma letra da colmeia à tentativa atual
    backspace, // Função para apagar o último caractere digitado
    useHint, // Função para solicitar uma dica (revelar próxima letra) de uma palavra
    confirmWord, // Função para validar a palavra digitada contra o alvo atual
    resetGame, // Função para reiniciar a partida com novas palavras
    buildMaskedWord, // Função auxiliar que constrói a máscara da palavra (ex: "L O _ _ _ _ _")
    sessionUnits, // Lista completa de palavras e dicas da sessão atual
    currentUnitIndex, // Índice da palavra ativa que o jogador deve adivinhar no momento
  } = useSoletraGameLogic({
    data,
    settings: activeSettings,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  return (
    // Contêiner principal do painel do Jogo Soletra
    <div className="soletra-game panel">
      <HeaderJogo
        title={headerProps.title}
        time={timeLeft}
        points={currentPoints}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />

      {/* ── LISTA DE PALAVRAS-ALVO E DICAS (PROGRESSO DA RODADA) ── */}
      <div className="soletra-targets" aria-label="Progresso das palavras">
        {sessionUnits.map((unit, unitIdx) => {
          const solved = foundIndexes.has(unitIdx); // Verifica se a palavra já foi resolvida
          const isCurrent = unitIdx === currentUnitIndex && !solved; // Verifica se é o alvo ativo atual
          const isLocked = unitIdx > currentUnitIndex; // Palavras futuras ficam bloqueadas até resolver a atual
          const hintLevel = hintLevels[unitIdx] ?? 0; // Nível de dica atual da palavra
          const revealedByTimeout = timedOut && finished; // Revela palavras não resolvidas ao final do tempo
          const unsolvedTimeout = revealedByTimeout && !solved;

          // Define o texto a ser exibido no slot (palavra completa se resolvida/esgotada, ou máscara com underlines)
          const display =
            solved || revealedByTimeout
              ? unit.target.palavra
              : buildMaskedWord(unit.target.palavra, hintLevel);

          return (
            <div
              key={`${unit.target.palavra}-${unitIdx}`}
              className={`soletra-target-row ${solved ? "solved-word" : ""} ${isCurrent ? "current-word" : ""} ${isLocked ? "locked-word" : ""}`}
            >
              {/* SLOT DA PALAVRA */}
              <div
                className={`soletra-target-slot ${solved ? "solved" : ""} ${unsolvedTimeout ? "unsolved-timeout" : ""} ${isLocked && !revealedByTimeout ? "locked" : ""}`}
              >
                {display}
              </div>

              {/* BOTÃO DE SOLICITAÇÃO DE DICA (LÂMPADA) */}
              <button
                className="soletra-hint-btn"
                onClick={() => useHint(unitIdx)}
                disabled={
                  finished ||
                  solved ||
                  hintLevel >= MAX_HINTS_PER_WORD ||
                  isLocked
                }
                aria-label={`Dica da palavra ${unitIdx + 1}`}
                title={isLocked ? `Resolva a palavra ${unitIdx} primeiro` : ""}
              >
                DICA
              </button>

              {/* EXIBIÇÃO DA DICA TEXTUAL / STATUS */}
              <div className="soletra-target-hint">
                {isLocked ? (
                  <span className="soletra-locked-msg">
                    Resolva a palavra anterior
                  </span>
                ) : solved ? (
                  <span className="soletra-solved-msg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Palavra encontrada
                  </span>
                ) : isCurrent ? (
                  <span className="soletra-current-hint">
                    {unit.target.dica}
                  </span>
                ) : (
                  unit.target.dica
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SLOTS DE ENTRADA DAS LETRAS DIGITADAS ── */}
      <div className="soletra-input" aria-label="Letras digitadas">
        {Array.from({ length: activeWordLength }).map((_, idx) => {
          const letter = typedChars[idx];
          const colorClass = lastAttemptColors
            ? lastAttemptColors[idx] || ""
            : "";
          return (
            <div
              key={`slot-${idx}`}
              className={`soletra-input-slot ${colorClass}`}
            >
              {letter ?? ""}
            </div>
          );
        })}
      </div>

      {/* ── COLMEIA DE LETRAS (BOTÕES HEXAGONAIS) ── */}
      <div
        className="soletra-honeycomb"
        role="group"
        aria-label="Colmeia de letras"
      >
        <button
          className="soletra-hex-btn top"
          onClick={() => pushLetter(honeycomb[0])}
          disabled={finished}
        >
          {honeycomb[0]}
        </button>
        <button
          className="soletra-hex-btn top-right"
          onClick={() => pushLetter(honeycomb[1])}
          disabled={finished}
        >
          {honeycomb[1]}
        </button>
        <button
          className="soletra-hex-btn right"
          onClick={() => pushLetter(honeycomb[2])}
          disabled={finished}
        >
          {honeycomb[2]}
        </button>
        <button
          className="soletra-hex-btn bottom"
          onClick={() => pushLetter(honeycomb[3])}
          disabled={finished}
        >
          {honeycomb[3]}
        </button>
        <button
          className="soletra-hex-btn bottom-left"
          onClick={() => pushLetter(honeycomb[4])}
          disabled={finished}
        >
          {honeycomb[4]}
        </button>
        <button
          className="soletra-hex-btn left"
          onClick={() => pushLetter(honeycomb[5])}
          disabled={finished}
        >
          {honeycomb[5]}
        </button>
        {/* LETRA CENTRAL (Geralmente obrigatória ou de destaque na colmeia) */}
        <button
          className="soletra-hex-btn center"
          onClick={() => pushLetter(honeycomb[6])}
          disabled={finished}
        >
          {honeycomb[6]}
        </button>
      </div>

      {/* ── BOTÕES DE AÇÃO (APAGAR E ENVIAR) ── */}
      <div className="soletra-actions">
        <button className="btnApagar" onClick={backspace} disabled={finished}>
          LIMPAR
        </button>
        <button className="btnEnviar" onClick={confirmWord} disabled={finished}>
          ENVIAR
        </button>
      </div>

      {/* ── MODAL FINAL DE RESULTADOS E MINI-RANKING ── */}
      {finished && <Dialog />}
    </div>
  );
}
