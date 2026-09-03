import { useEffect } from "react";
import useLabirintoLogic from "./useLabirintoLogic";
import "./labirintoGame.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * Componente principal da interface do Jogo Labirinto (View).
 * Sua responsabilidade é puramente visual e de captura de eventos de usuário (clique e arraste).
 * Toda a lógica de estado, tempo, checagem de regras e geometria é delegada ao hook `useLabirintoLogic`.
 *
 * @param {Object} props — Propriedades recebidas do componente pai (App principal).
 * @param {Object} props.data — Dados do jogo, contendo a lista de palavras (`words`).
 * @param {Object} props.config — Configurações da partida (ex: `timeLimitSeconds`, `gridSize`).
 * @param {Object} props.sessionScore — Dados da pontuação da sessão atual (se houver).
 * @param {Function} props.onScore — Callback chamada ao pontuar ou finalizar a partida.
 * @param {Function} props.onRoundComplete — Callback chamada ao completar um round com sucesso.
 */
function LabirintoPointerIcon({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 6px var(--Color-5, #F60085))" }}
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="var(--primary-alpha-30, rgba(246, 0, 133, 0.3))"
        stroke="var(--Color-5, #F60085)"
        strokeWidth="2"
      />
      <path
        d="M16 4L24 23L16 18.5L8 23L16 4Z"
        fill="var(--Color-5, #F60085)"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

export default function LabirintoGame({
  data = {},
  config = {},
  sessionScore,
  onScore,
  onRoundComplete,
  onGameOver,
  headerProps = {},
}) {
  // Inicializa o Custom Hook passando todas as props recebidas.
  // O hook retorna o estado atualizado e as funções de manipulação do jogo.
  const logic = useLabirintoLogic({
    data,
    config,
    sessionScore,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  // Desestrutura todas as variáveis de estado, referências e métodos de ação fornecidos pelo hook.
  const {
    round, // O objeto do round atual contendo a dica da palavra
    word, // A palavra atual a ser formada no labirinto
    grid, // Matriz bidimensional representando as células do tabuleiro
    checkpoints, // Coordenadas de cada letra
    checkpointMap, // Mapa que associa a chave da célula (r-c) ao índice da letra na palavra
    shouldMarkFirstCheckpoint, // Flag indicando se o primeiro checkpoint deve ser destacado (início do jogo)
    boardGridSize, // Tamanho do grid (ex: 8 para 8x8)
    progress, // Índice da última letra correta alcançada (-1 se nenhuma)
    trail, // Array de coordenadas [{r, c}] por onde o jogador já passou
    trailSet, // Set contendo as chaves 'r-c' da trilha para busca rápida (O(1))
    errors, // Contagem de erros cometidos na partida
    dragging, // Flag indicando se o usuário está arrastando
    timeLeft, // Tempo restante em segundos
    finished, // Flag indicando se a partida foi encerrada (vitória ou derrota)
    timedOut, // Flag indicando se o encerramento foi por esgotamento do tempo
    hintText, // Texto da dica atual a ser exibida ao jogador
    boardRef, // Referência do DOM para o contêiner do grid (usada no ResizeObserver)
    cellSize, // Tamanho dinâmico calculado de cada célula em pixels
    hasRound, // Flag indicando se um round válido foi gerado e está pronto
    configurationIssue,
    configurationMessage,
    wallSegments, // Array com as coordenadas absolutas das paredes (barreiras)
    trailSegments, // Array com as coordenadas absolutas das linhas de conexão do rastro
    collectedLetters, // Array contendo as letras já coletadas pelo jogador no percurso
    timeLimitSeconds, // Tempo total limite configurado para a partida
    startDrag, // Função disparada ao iniciar o toque/clique em uma célula (PointerDown)
    dragOver, // Função disparada ao arrastar o dedo/mouse sobre uma célula (PointerEnter)
    endDrag, // Função disparada ao soltar o dedo/mouse (PointerUp)
    handleClick, // Função disparada ao clicar diretamente em uma célula (Click padrão)
    resetAttempt, // Função para limpar o rastro atual e recomeçar a tentativa
    newGame, // Função para gerar um novo labirinto com outra palavra
    showHint, // Função para calcular e exibir uma dica de direção
    matchedCheckpointKeys, // Chaves dos checkpoints alcançados na ordem correta
    posKey, // Função auxiliar para gerar a chave de posição 'r-c'
  } = logic;

  // Pontuação parcial (0-100) calculada a partir do progresso atual.
  const points = Math.floor(
    (Math.max(0, (progress ?? 0) + 1) / ((word && word.length) || 1)) * 100,
  );

  // Manipulador de arraste unificado para toque/mouse em telas touch
  const handlePointerMove = (e) => {
    if (!dragging) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;
    const cell = element.closest("[data-row]");
    if (cell) {
      const r = parseInt(cell.getAttribute("data-row"), 10);
      const c = parseInt(cell.getAttribute("data-col"), 10);
      if (Number.isFinite(r) && Number.isFinite(c)) {
        dragOver(r, c);
      }
    }
  };

  // Debug de renderização do grid removido conforme solicitação do usuário

  return (
    // Contêiner principal do painel do jogo.
    // O evento onPointerUp global garante que o arraste seja encerrado mesmo se o usuário soltar o clique fora do tabuleiro.
    <div className="labirinto-panel" onPointerUp={endDrag}>
      <HeaderJogo
        title={headerProps.title ?? "Labirinto"}
        time={timeLeft}
        points={points}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />
      
      {round?.hint && (
        <div className="labirinto-hint-container">
          <p className="labirinto-hint-text"><strong>DICA:</strong> {round.hint}</p>
        </div>
      )}

      {/* CONTROLE DE FLUXO: Se não foi possível gerar o labirinto, exibe tela de erro/tentar novamente */}
      {!hasRound ? (
        <div className="result-box">
          <p>
            {configurationIssue
              ? configurationMessage
              : "Nao foi possivel montar o labirinto agora."}
          </p>
          <button className="primary" onClick={newGame}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* ÁREA DO TABULEIRO (GRID E OVERLAYS) */}
          <div className="labirinto-board">
            {/* O Grid principal contendo os botões interativos */}
            <div
              ref={boardRef}
              className="labirinto-grid"
              role="grid"
              aria-label="Labirinto de letras"
              onPointerMove={handlePointerMove}
              style={{
                // Define dinamicamente o número de colunas do CSS Grid com base na configuração
                gridTemplateColumns: `repeat(${boardGridSize}, minmax(0, 1fr))`,
              }}
            >
              {/* Mapeia as linhas e colunas da matriz para renderizar as células */}
              {grid.map((row, r) =>
                row.map((cell, c) => {
                  const key = posKey(r, c);
                  const isTrail = trailSet.has(key); // Verifica se a célula faz parte da trilha atual
                  const cpIndex = checkpointMap.get(key);
                  // Verifica se a célula é o checkpoint inicial da palavra
                  const isStartCheckpoint =
                    shouldMarkFirstCheckpoint &&
                    cpIndex !== undefined &&
                    cell.letter === word[0];

                  return (
                    // Botão interativo representando uma célula do labirinto
                    <button
                      key={cell.key}
                      role="gridcell"
                      className={`labirinto-cell ${isTrail ? "trail" : ""} ${isStartCheckpoint ? "checkpoint" : ""}`}
                      data-row={r}
                      data-col={c}
                      onPointerDown={() => startDrag(r, c)} // Inicia o arraste ao pressionar
                      onPointerEnter={() => dragOver(r, c)} // Continua o arraste ao passar por cima
                      onPointerUp={endDrag} // Encerra o arraste ao soltar
                      onClick={() => handleClick(r, c)} // Suporte a clique simples
                      disabled={finished} // Bloqueia interações após o fim do jogo
                    >
                      {/* Caractere contido na célula (visível se preenchido, oculto se vazio) */}
                      <span
                        className={`labirinto-cell-letter ${cell.letter ? "filled" : "empty"} ${isTrail && cell.letter ? "passed" : ""}`}
                      >
                        {cell.letter}
                      </span>
                    </button>
                  );
                }),
              )}

              {/* CAMADA DE SOBREPOSIÇÃO (OVERLAY): Desenha elementos gráficos por cima dos botões */}
              <div className="labirinto-overlay" aria-hidden="true">
                {/* 1. Desenha as linhas que conectam as células da trilha (rastro) */}
                {trailSegments.map((seg) => (
                  <div
                    key={seg.key}
                    className="labirinto-trail-segment"
                    style={{
                      left: seg.x,
                      top: seg.y,
                      width: seg.width,
                      height: seg.height,
                    }}
                  />
                ))}

                {/* 2. Desenha os nós (pontos centrais) nas interseções da trilha */}
                {trail.map((p, idx) => (
                  <div
                    key={`node-${idx}`}
                    className="labirinto-trail-node"
                    style={{
                      left: p.c * cellSize + cellSize / 2,
                      top: p.r * cellSize + cellSize / 2,
                      width: Math.max(14, cellSize * 0.28),
                      height: Math.max(14, cellSize * 0.28),
                    }}
                  />
                ))}

                {/* 2.1. Marca visual na ponta da trilha (ponteiro de navegação direcional) */}
                {trail.length > 0 &&
                  (() => {
                    const last = trail[trail.length - 1];
                    const prev = trail[trail.length - 2];
                    const tipSize = Math.max(24, cellSize * 0.7);
                    const dx = prev ? last.c - prev.c : 0;
                    const dy = prev ? last.r - prev.r : 0;
                    const tipAngle =
                      dx === 1
                        ? 90
                        : dx === -1
                          ? -90
                          : dy === 1
                            ? 180
                            : dy === -1
                              ? 0
                              : 0;

                    return (
                      <div
                        className="labirinto-trail-tip"
                        style={{
                          left: last.c * cellSize + cellSize / 2,
                          top: last.r * cellSize + cellSize / 2,
                          width: tipSize,
                          height: tipSize,
                          transform: `translate(-50%, -50%) rotate(${tipAngle}deg)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LabirintoPointerIcon size={tipSize} />
                      </div>
                    );
                  })()}

                {/* 3. Desenha as paredes (barreiras físicas que impedem a passagem) */}
                {wallSegments.map((seg) => (
                  <div
                    key={seg.key}
                    className="labirinto-wall-segment"
                    style={{
                      left: seg.x,
                      top: seg.y,
                      width: seg.width,
                      height: seg.height,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="letrasLimpar">
            {/* BARRA DE PROGRESSO DA PALAVRA: Mostra as letras coletadas no percurso em tempo real */}
            <div
              className="labirinto-word-progress"
              aria-label="Letras ja passadas"
            >
              {collectedLetters.length === 0 ? (
                // Exibido no início quando nenhuma letra foi alcançada ainda
                <span className="labirinto-word-progress-empty">
                  A palavra vai surgir conforme a linha avança.
                </span>
              ) : (
                // Mapeia e exibe cada letra já alcançada na trilha
                collectedLetters.map((ch, idx) => (
                  <span
                    key={`wp-${idx}`}
                    className="labirinto-word-progress-char done"
                  >
                    {ch}
                  </span>
                ))
              )}
            </div>
            {/* BOTÕES DE AÇÃO: Limpar rastro e Solicitar dica */}
            <div className="labirinto-actions">
              <button
                className="btnLimpar"
                onClick={resetAttempt}
                disabled={finished} // Desativa se o jogo já terminou
              >
                Limpar
              </button>
            </div>
          </div>
        </>
      )}

      {/* TELA DE RESULTADO FINAL: Exibida quando a partida é concluída (vitória ou tempo esgotado) */}
      {finished && <Dialog />}
    </div>
  );
}
