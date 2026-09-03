import useHangmanGameLogic from "./useHangmanGameLogic";
import "./hangmanGame.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { LifeIcon50, LifeIconFull } from "../../componentsTag/icon/lifeIcon";
import { wholeSeconds } from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";
import { normalizeText } from "../../../utils/string";

const HANGMAN_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ç"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

/**
 * COMPONENTE VISUAL DO JOGO DA FORCA (HangmanGame.jsx)
 * Responsável exclusivamente pela renderização da interface gráfica (View), exibição
 * do teclado interativo, contagem de vidas, cronômetro e tela de resultados.
 * Toda a lógica de estado, checagem de letras e controle de tempo é delegada ao hook `useHangmanGameLogic`.
 *
 * @param {Object} props - Propriedades recebidas do componente pai (App principal).
 * @param {Object} props.data - Objeto contendo a lista de palavras (`words`) carregadas da API.
 * @param {Object} props.config - Configurações da partida (ex: `timeLimitSeconds`, `maxLives`).
 * @param {Array} props.ranking - Lista com os top jogadores para exibição no mini-ranking final.
 * @param {Function} props.onScore - Callback acionada ao finalizar a partida para registrar os pontos globais.
 * @param {Function} props.onRoundComplete - Callback acionada quando o jogador descobre a palavra com sucesso.
 * @param {Function} props.onGameOver - Callback acionada quando o jogador perde (por esgotamento de vidas ou tempo).
 */
export default function HangmanGame({
  data = {},
  config = {},
  settings = {},
  ranking = [],
  onScore,
  onRoundComplete,
  onGameOver,
  headerProps = {},
}) {
  const activeConfig = { ...config, ...settings };
  // Inicializa o Custom Hook desestruturando todas as variáveis de estado, métricas e ações da Forca
  const {
    alphabet, // Lista de letras disponíveis no teclado virtual (A-Z + Ç)
    secret, // Palavra secreta atual (usada na tela final de game over)
    secretNormalized,
    masked, // String formatada com underlines (_) para letras ocultas e letras reveladas
    guessed, // Set contendo todas as letras já clicadas pelo jogador
    selectedLetters, // Histórico das letras já selecionadas
    lives, // Quantidade atual de vidas restantes
    maxLives,
    timeLeft, // Tempo restante no cronômetro regressivo
    finished, // Flag indicando se a partida foi encerrada
    timedOut, // Flag indicando se o fim de jogo foi causado pelo término do tempo
    won, // Flag indicando se o jogador adivinhou a palavra completa
    noWords, // Flag indicando se a lista de palavras fornecida estava vazia
    configurationIssue,
    configurationMessage,
    currentPoints, // Pontuação atual calculada com base nas letras reveladas
    pickLetter, // Função disparada ao clicar em uma letra do teclado virtual
    resetGame, // Função disparada ao clicar no botão de novo jogo
  } = useHangmanGameLogic({
    data,
    config: activeConfig,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  const isCorrectLetter = (letter) => {
    const norm = normalizeText(letter);
    return Boolean(secretNormalized?.includes?.(norm) && guessed.has(norm));
  };

  const isGuessedLetter = (letter) => {
    const norm = normalizeText(letter);
    return guessed.has(norm);
  };

  const isBlocked = noWords || configurationIssue;

  return (
    // Contêiner principal do painel do jogo da forca
    <div className="hangman-game panel">
      <HeaderJogo
        title={headerProps.title ?? "Forca"}
        time={timeLeft}
        points={currentPoints}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
      />

      {/* CABEÇALHO DO PAINEL: Exibe título, vidas restantes, pontos atuais e tempo */}
      <div className="vidas">
        <div className="vidas_info">
          <span className="vidas_span">Vidas:</span>
          <div
            className="vidas_icons"
            aria-label={`Vidas restantes ${lives} de ${maxLives}`}
          >
            {Array.from({ length: maxLives }).map((_, index) => (
              <span
                key={index}
                className={`vida_icon ${index < lives ? "full" : "spent"}`}
                aria-hidden="true"
              >
                {index < lives ? <LifeIconFull /> : <LifeIcon50 />}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="palavra_teclado">
        {/* ÁREA DA PALAVRA MASCARADA: Exibe os underlines ou as letras adivinhadas */}
        <div className="hangman-word" aria-live="polite">
          {configurationIssue
            ? configurationMessage
            : noWords
              ? "Sem palavras para jogar."
              : masked}
        </div>

        {/* TECLADO VIRTUAL INTERATIVO QWERTY */}
        <div className={`hangman-keyboard ${isBlocked ? "blocked" : ""}`}>
          {HANGMAN_KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="hangman-keyboard-row">
              {row.map((letter) => {
                const isGuessed = isGuessedLetter(letter);
                const isCorrect = isCorrectLetter(letter);
                const isWrong = isGuessed && !isCorrect;

                return (
                  <button
                    type="button"
                    key={letter}
                    className={`hangman-key ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""} ${isGuessed ? "guessed" : ""}`}
                    // Desativa a tecla se o jogo terminou, se não houver palavras ou se a letra já foi clicada
                    disabled={won || isGuessed || finished || isBlocked}
                    onClick={() => pickLetter(letter)}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="selecionadas">
        {!isBlocked &&
          selectedLetters.map((item, index) => (
            <span
              key={`${item.letter}-${index}`}
              className={`selecionada_letter ${item.correct ? "correct" : "wrong"}`}
            >
              {item.letter}
            </span>
          ))}
      </div>
      {/* TELA DE RESULTADO FINAL (MODAL DE FIM DE JOGO) */}
      {finished && !isBlocked && <Dialog />}
    </div>
  );
}
