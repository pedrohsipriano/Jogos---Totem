import { useMemo } from "react";
import useWordSearchLogic from "../CacaPalavrasGame/useWordSearchLogic";
import "./wordSearchGameMulher.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import { Dialog } from "../../Dialog/Dialog";
import { wholeSeconds } from "../../../utils/time";

/**
 * COMPONENTE VISUAL DO JOGO CAÇA-PALAVRAS (WordSearchGame.jsx)
 * Responsável exclusivamente pela renderização da interface gráfica (View).
 * Apresenta o cabeçalho com HUD reativo (tempo, pontos e progresso de palavras encontradas),
 * a grade interativa de células de letras (suportando seleção contínua por arraste/toque),
 * a lista de palavras-alvo (chips indicando o status de conclusão) e o painel de resultados com mini-ranking.
 *
 * @param {Object} props - Propriedades recebidas do componente orquestrador (App).
 * @param {Object} props.data - Dados brutos da rodada contendo a lista de palavras (`data.words`).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`, `gridSize`, `maxAttempts`, `maxWords`).
 * @param {Array} props.ranking - Lista de top jogadores para exibição no mini-ranking final da sessão.
 * @param {Function} props.onScore - Callback disparada ao finalizar a partida para registrar a pontuação.
 * @param {Function} props.onRoundComplete - Callback disparada ao encontrar todas as palavras com sucesso.
 * @param {Function} props.onGameOver - Callback disparada ao esgotar o tempo da partida.
 */
export default function WordSearchGame({
  data = {},
  config = {},
  settings = {},
  ranking = [],
  onScore,
  onRoundComplete,
  onGameOver,
  headerProps = {}, // props que serão repassados ao `HeaderJogo`
}) {
  const activeSettings = { ...config, ...settings };
  // Consome o Custom Hook que gerencia a geração da grade, validação de arraste, temporizadores e pontuação
  const logic = useWordSearchLogic({
    data,
    settings: activeSettings,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  // Memoriza a variável CSS com o número de colunas da grade para garantir o alinhamento correto
  const gridStyle = useMemo(
    () => ({ "--ws-cols": logic.gridCols }),
    [logic.gridCols],
  );

  // Manipulador de arraste unificado para toque/mouse em telas touch
  const handlePointerMove = (e) => {
    if (!logic.selecting) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    const cell = element.closest("[data-row]");
    if (cell) {
      const r = parseInt(cell.getAttribute("data-row"), 10);
      const c = parseInt(cell.getAttribute("data-col"), 10);
      if (Number.isFinite(r) && Number.isFinite(c)) {
        logic.extendSelect(r, c);
      }
    }
  };

  return (
    // Contêiner principal do painel de Caça-palavras
    // Captura o término do arraste (onPointerUp) globalmente para evitar travamentos de seleção caso o cursor saia da grade
    <div className="wordsearch-game-mulher panel" onPointerUp={logic.finishSelect}>
      <HeaderJogo
        title={headerProps.title ?? "Caça-palavras"}
        time={logic.timeLeft}
        points={logic.currentPoints}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
        gameCode="wordsearch_mulher"
      />

      {/* ── GRADE INTERATIVA DE LETRAS (OU AVISO DE FALHA DE GERAÇÃO) ── */}
      {!logic.noWords && !logic.generationFailed && logic.grid ? (
        <div 
          className="ws-grid" 
          role="grid" 
          style={gridStyle}
          onPointerMove={handlePointerMove}
        >
          {/* Itera sobre as linhas da grade gerada */}
          {logic.grid.map((row, rIdx) => (
            <div className="ws-row" role="row" key={rIdx}>
              {/* Itera sobre as células individuais de cada linha */}
              {row.map((cell, cIdx) => {
                // Aplica classes visuais dinâmicas caso a célula esteja selecionada no momento ou já faça parte de uma palavra encontrada
                const selectedClass = logic.isSelected(rIdx, cIdx)
                  ? "selected"
                  : "";
                const foundClass = logic.isFound(rIdx, cIdx) ? "found" : "";

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    className={`ws-cell ${selectedClass} ${foundClass}`}
                    data-row={rIdx}
                    data-col={cIdx}
                    onPointerDown={() => logic.beginSelect(rIdx, cIdx)} // Inicia a seleção no clique/toque
                    onPointerEnter={() => logic.extendSelect(rIdx, cIdx)} // Expande a seleção ao arrastar sobre as células (desktop)
                    onPointerUp={logic.finishSelect} // Finaliza e valida a seleção ao soltar
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* TELA DE AVISO: Exibida caso não haja palavras cadastradas ou o algoritmo de encaixe tenha falhado */
        <div className="ws-result-box" aria-live="polite">
          <p>
            {logic.noWords
              ? "Sem palavras para jogar."
              : "Não foi possível gerar a grade."}
          </p>
          <button className="primary" onClick={logic.resetGame}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── LISTA DE PALAVRAS-ALVO (CHIPS VISUAIS) ── */}
      <div className="ws-words">
        {logic.wordsFitting.map((word) => (
          <span
            key={word}
            className={`ws-word-chip ${logic.found.has(word) ? "done" : ""}`}
          >
            {word}
          </span>
        ))}
      </div>

      {/* ── MODAL FINAL DE RESULTADOS E MINI-RANKING ── */}
      {(logic.finished || logic.timedOut) && <Dialog />}
    </div>
  );
}
