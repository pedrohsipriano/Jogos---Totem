import { useMemo } from "react";
import useWhacGameLogic from "./useWhacGameLogic";
import "./whacGame.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { wholeSeconds } from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * COMPONENTE VISUAL DO JOGO WHAC-A-MOLE FUTURISTA / OMNI-CATCH (WhacGame.jsx)
 * Responsável exclusivamente pela renderização da interface gráfica (View).
 * Apresenta a tela inicial de preparação (exibindo o ícone-alvo da partida),
 * a grade dinâmica de slots interativos (onde alvos e distratores surgem e desaparecem)
 * e o painel final de pontuação com mini-ranking.
 *
 * @param {Object} props - Propriedades recebidas do componente orquestrador (App).
 * @param {Object} props.data - Dados da rodada (atualmente sem uso de banco externo para este jogo).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`).
 * @param {Array} props.ranking - Lista de top jogadores para exibição no mini-ranking final.
 * @param {Function} props.onScore - Callback disparada ao finalizar a partida para registrar a pontuação.
 * @param {Function} props.onGameOver - Callback disparada ao término do jogo.
 */
function renderWhacIcon(icon) {
  if (icon === "OMNI") {
    return (
      <img
        src="/images/logo.png"
        alt="Alvo"
        className="whac-logo-img-cell"
      />
    );
  }
  if (icon === "DECOY_X") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    );
  }
  if (icon === "DECOY_DOWN") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    );
  }
  if (icon === "DECOY_WARN") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  }
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}

export default function WhacGame({
  data = {},
  config = {},
  settings = {},
  ranking = [],
  onScore,
  onGameOver,
  onPlayAgain,
  headerProps = {},
}) {
  // Desestrutura o Custom Hook que gerencia o loop de spawn, temporizadores e pontuação
  const activeSettings = { ...config, ...settings };
  const logic = useWhacGameLogic({
    data,
    settings: activeSettings,
    onScore,
    onGameOver,
  });

  // Calcula dinamicamente o número de colunas da grade com base no tamanho total (gridSize)
  // Mantém um mínimo de 3 e máximo de 6 colunas para um layout quadrado/retangular balanceado
  const gridColumns = Math.max(
    3,
    Math.min(6, Math.ceil(Math.sqrt(logic.gridSize))),
  );

  // Memoiza os índices de slots e o mapa de busca O(1) para máxima performance
  const slotIndices = useMemo(
    () => Array.from({ length: logic.gridSize }, (_, i) => i),
    [logic.gridSize],
  );

  const activeSlotsMap = useMemo(() => {
    const map = new Map();
    for (const item of logic.activeSlots) {
      map.set(item.index, item);
    }
    return map;
  }, [logic.activeSlots]);

  return (
    // Contêiner principal do painel do Jogo Omni-Catch
    <div className="whac-game panel">
      <HeaderJogo
        title={headerProps.title ?? "Omni-Catch"}
        time={logic.timeLeft}
        points={logic.score}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />

      {/* ── TELA DO JOGO ATIVO (GRADE DE SLOTS) ── */}
      {logic.gameStarted && !logic.finished && (
        <>
          {/* GRADE DINÂMICA DE SLOTS INTERATIVOS */}
          <div
            className="whac-grid"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
          >
            {/* Itera sobre os slots com busca instantânea em tempo O(1) */}
            {slotIndices.map((index) => {
              const slot = activeSlotsMap.get(index);
              const isActive = Boolean(slot);
              const isClicked = slot ? logic.clickedIds.has(slot.id) : false;
              const icon = slot?.icon ?? null;
              const itemDuration = slot ? `${slot.duration}ms` : undefined;

              return (
                <button
                  key={index}
                  type="button"
                  className={`whac-slot ${isActive ? "active" : ""} ${
                    slot?.isTarget ? "target" : ""
                  } ${isClicked ? "clicked" : ""}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    logic.handleSlotClick(index);
                  }}
                  onClick={() => logic.handleSlotClick(index)}
                  disabled={!logic.gameActive || isClicked}
                  style={
                    isActive && itemDuration
                      ? { animationDuration: itemDuration } // Sincroniza a animação CSS com a duração do item
                      : undefined
                  }
                >
                  {/* RENDERIZA O ÍCONE (ALVO OU DISTRATOR) CASO O SLOT ESTEJA ATIVO */}
                  {isActive && (
                    <span className="whac-icon">
                      {renderWhacIcon(icon)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── MODAL FINAL DE RESULTADOS E MINI-RANKING ── */}
      {logic.finished && <Dialog />}
    </div>
  );
}
