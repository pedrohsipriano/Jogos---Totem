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
 * @param {Function} props.onPlayAgain - Callback disparada ao clicar em "Novo Jogo".
 */
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
            {/* Itera sobre o número total de slots configurados (gridSize) */}
            {Array.from({ length: logic.gridSize }).map((_, index) => {
              // Busca se há um item ativo posicionado neste índice de slot
              const slot = logic.activeSlots.find(
                (item) => item.index === index,
              );
              const isActive = Boolean(slot);
              const isClicked = slot ? logic.clickedIds.has(slot.id) : false;
              const icon = slot?.icon ?? null;
              const itemDuration = slot ? `${slot.duration}ms` : undefined;

              return (
                <button
                  key={index}
                  className={`whac-slot ${isActive ? "active" : ""} ${
                    slot?.isTarget ? "target" : ""
                  } ${isClicked ? "clicked" : ""}`}
                  onClick={() => logic.handleSlotClick(index)}
                  disabled={!isActive || isClicked} // Desabilita slots vazios ou já clicados
                  style={
                    isActive && itemDuration
                      ? { animationDuration: itemDuration } // Sincroniza a animação CSS com a duração do item
                      : undefined
                  }
                >
                  {/* RENDERIZA O ÍCONE (ALVO OU DISTRATOR) CASO O SLOT ESTEJA ATIVO */}
                  {isActive && (
                    <span className="whac-icon">
                      {icon === "OMNI" ? (
                        <img
                          src="/images/logo.png"
                          alt="OmniVarejo"
                          className="whac-logo-img-cell"
                        />
                      ) : (
                        icon
                      )}
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
