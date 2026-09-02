import useQuizGameLogic from "../quizGame/useQuizGameLogic";
import "./quizGameMulher.style.css";
import HeaderJogo from "../../headerJogo/HeaderJogo";
import formatSecondsMs from "../../../utils/time";
import { wholeSeconds } from "../../../utils/time";
import { Dialog } from "../../Dialog/Dialog";

/**
 * QuizGame — Componente de View puro.
 *
 * Props (contrato padronizado):
 *   data             — { questions: Array<{ question|prompt, options, answer }> }
 *   settings         — { timeLimitSeconds, questionLimit }
 *   ranking          — Array de objetos para o mini-ranking
 *   onScore          — Callback disparado ao finalizar partida
 *   onRoundComplete  — Callback disparado ao responder todas
 *   onGameOver       — Callback disparado quando o tempo esgota
 */
export default function QuizGame({
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
  const {
    step,
    currentQuestion,
    randomizedQuestions,
    answersByStep,
    finished,
    timedOut,
    noQuestions,
    timeLeft,
    currentPoints,
    chooseAnswer,
    resetGame,
    isPaused,
    lastSelection,
  } = useQuizGameLogic({
    data,
    settings: activeSettings,
    onScore,
    onRoundComplete,
    onGameOver,
  });

  return (
    <div className="quiz-game-mulher panel">
      <HeaderJogo
        title={headerProps.title ?? "Quiz"}
        time={timeLeft}
        points={currentPoints}
        onBackToMenu={headerProps.onBackToMenu}
        onBackToCadastro={headerProps.onBackToCadastro}
        gameCode="quiz_mulher"
      />

      {finished ? (
        <Dialog />
      ) : (
        /* ── Pergunta ativa ── */
        <div className="quiz-box">
          <p className="quiz-question">
            {noQuestions || !currentQuestion
              ? "Sem perguntas disponíveis."
              : currentQuestion.prompt}
          </p>
          <div className="quiz-options">
            {!noQuestions && currentQuestion ? (
              currentQuestion.options.map((option) => {
                const isSelected = lastSelection?.option === option;
                const feedbackClass = isSelected
                  ? lastSelection.isCorrect
                    ? "feedback-correct"
                    : "feedback-wrong"
                  : "";

                return (
                  <button
                    key={`${currentQuestion.prompt}-${option}`}
                    className={`quiz-option ${feedbackClass}`}
                    onClick={() => chooseAnswer(option)}
                    disabled={finished || isPaused}
                  >
                    {option}
                  </button>
                );
              })
            ) : (
              <button className="quiz-option" disabled>
                Aguarde novas perguntas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
