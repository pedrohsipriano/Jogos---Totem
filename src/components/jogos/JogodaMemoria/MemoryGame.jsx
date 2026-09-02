// Hook que contém toda a lógica do jogo (estado, temporizador, pontuação, etc.)
import useMemoryGameLogic from "./useMemoryGameLogic";
// Utilitário para resolver URLs de imagens/recursos apontando para a API/public
import { resolveApiUrl } from "../../../lib/apiBaseUrl";
// Componente de cabeçalho reutilizável usado nas telas de jogo
import { HeaderJogo } from "../../headerJogo/HeaderJogo";
// Estilos do componente (CSS modular do app)
import "./memoryGame.style.css";
import { wholeSeconds } from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * MemoryGame — Componente de View puro.
 *
 * Props (contrato padronizado):
 *   data             — { symbols: string[] }
 *   config           — { timeLimitSeconds, pairCount, seed }
 *   ranking          — Array de objetos para o mini-ranking
 *   onScore          — Callback disparado ao finalizar partida
 *   onRoundComplete  — Callback disparado ao completar todos os pares
 *   onGameOver       — Callback disparado quando o tempo esgota
 */
export default function MemoryGame({
  // Props e valores padrão
  data = {}, // { symbols: string[] } ou similar: dados das cartas
  config = {}, // configurações (tempo, quantidade de pares, seed)
  ranking = [], // ranking (opcional) para mostrar no resultado
  headerProps = {}, // props que serão repassados ao `HeaderJogo`
  onScore, // callback quando pontuação for finalizada
  onRoundComplete, // callback ao completar todos os pares
  onGameOver, // callback quando o tempo esgotar
}) {
  // Desestruturação do hook que expõe o estado e as ações do jogo
  const {
    cards, // array de cartas: { id, label, imageUrl?, matched }
    flipped, // array de ids que estão viradas no momento
    previewing, // booleano: se está no modo pré-visualização (mostrar todas)
    finished, // booleano: se o jogo terminou
    timedOut, // booleano: se terminou por tempo esgotado
    noSymbols, // booleano: sem cartas disponíveis (erro/estado vazio)
    timeLeft, // número: segundos restantes
    matchedPairs, // número de pares encontrados
    totalPairs, // número total de pares necessários
    currentPoints, // pontos atuais do jogador
    handleFlip, // função para virar uma carta (recebe card.id)
    resetGame, // função para reiniciar o jogo
  } = useMemoryGameLogic({
    data,
    config,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  return (
    <div className="memory-game panel">
      {/* Cabeçalho: título, subtítulo, tempo e pontos */}
      <HeaderJogo
        title={headerProps.title ?? "Jogo da Memoria"}
        time={timeLeft}
        points={currentPoints}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />

      {/* ── Tabuleiro: mostra as cartas quando existem símbolos disponíveis ── */}
      {!noSymbols ? (
        <div className="memory-grid">
          {cards.map((card) => {
            // `show` indica se a face da carta deve ser exibida (pré-visualização, já combinada ou virada)
            const show =
              previewing || card.matched || flipped.includes(card.id);

            return (
              <button
                key={card.id}
                // classes condicionais para estilos (virada / combinada)
                className={`card ${show ? "card-flipped" : ""} ${card.matched ? "card-matched" : ""}`}
                onClick={() => handleFlip(card.id)}
                aria-label={`Carta ${card.label}`}
              >
                {show ? (
                  // Se a carta tem imagem, renderiza <img> com URL resolvida, caso contrário mostra o label
                  card.imageUrl ? (
                    <img
                      src={resolveApiUrl(card.imageUrl)}
                      alt={card.label}
                      className="card-img"
                    />
                  ) : (
                    <span>{card.label}</span>
                  )
                ) : (
                  // Face traseira quando não deve mostrar
                  ""
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Mensagem de fallback quando não há cartas
        <div className="result-box" aria-live="polite">
          <p>Sem cartas para jogar.</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      )}

      {/* ── Resultado: área exibida quando `finished` é true ── */}
      {finished && <Dialog />}
    </div>
  );
}
