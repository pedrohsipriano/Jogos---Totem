import useCatchGameLogic from "./useCatchGameLogic";
import "./catchGame.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * COMPONENTE VISUAL DA CESTA DE OFERTAS (CatchGame.jsx)
 * Responsável exclusivamente pela renderização da interface gráfica (View), exibição
 * do cabeçalho com pontuação e cronômetro, a área do jogo em HTML5 Canvas e a tela final.
 * Toda a lógica de física, animação (requestAnimationFrame) e pontuação fica no hook `useCatchGameLogic`.
 *
 * @param {Object} props - Propriedades recebidas do componente pai (App principal).
 * @param {Object} props.data - Objeto de dados (não utilizado neste jogo contínuo, mantido pelo contrato).
 * @param {Object} props.settings - Configurações da partida (ex: `timeLimitSeconds`).
 * @param {Array} props.ranking - Lista com os top jogadores para exibição no mini-ranking final.
 * @param {Function} props.onScore - Callback acionada ao finalizar a partida para registrar os pontos globais.
 * @param {Function} props.onRoundComplete - Callback de vitória (não se aplica a este jogo por tempo).
 * @param {Function} props.onGameOver - Callback acionada quando o tempo se esgota.
 */
export default function CatchGame({
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
  // Inicializa o Custom Hook desestruturando as referências do DOM, estado do HUD e manipuladores de eventos
  const {
    canvasRef, // Referência para o elemento <canvas> onde os itens e a cesta são desenhados
    stageRef, // Referência para a div contêiner (usada para calcular dimensões e eventos de toque)
    points, // Pontuação atual acumulada
    timeLeft, // Tempo restante no cronômetro regressivo
    finished, // Flag indicando se a partida foi encerrada
    timedOut, // Flag indicando se o fim de jogo foi causado pelo término do tempo
    handlePointerDown, // Função disparada ao clicar ou tocar em um local estático
    handlePointerMove, // Função disparada ao mover o mouse ou tocar na tela para mover a cesta
    restartGame, // Função para reiniciar a partida
  } = useCatchGameLogic({
    data,
    settings: activeSettings,
    onScore,
    onGameOver,
  });

  // Determina se a tela final de resultado deve ser exibida
  const showResult = finished && timeLeft <= 0;

  return (
    // Contêiner principal do painel do jogo
    <div className="catch-game panel">
      <HeaderJogo
        title={headerProps.title ?? "Cesta de Ofertas"}
        time={timeLeft}
        points={points}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />

      {/* ÁREA INTERATIVA DO JOGO (STAGE): Captura eventos de clique/toque e movimento */}
      <div className="estantePontos">
        <div className="pontuacao1">
          <span>Pontuação</span>
        </div>
        <div className="itensLegenda">
          <div className="imgdiv">
            <img src="/images/dinheirospecial.png" alt="Item Especial" /> +20
          </div>
          <div className="imgdiv">
            <img src="/images/exclamacaobad.png" alt="Item Ruim" />
            <img src="/images/xbad.png" alt="Item Ruim" /> -10
          </div>
          <div className="imgdiv">
            <img src="/images/Attach-Money.png" alt="Item Ruim" />
            <img src="/images/Attach-Money2.png" alt="Item Ruim" />
            <img src="/images/Attach-Money3.png" alt="Item Ruim" /> +10
          </div>
        </div>
      </div>
      <div
        ref={stageRef}
        className="catch-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <canvas
          ref={canvasRef}
          className="catch-canvas"
          aria-label="Área do jogo Cesta de Ofertas"
        />
      </div>

      {/* TELA DE RESULTADO FINAL (MODAL INTERNO DE FIM DE JOGO) */}
      {showResult && <Dialog />}
    </div>
  );
}
