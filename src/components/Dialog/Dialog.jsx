import { useEffect, useRef, useState } from "react";
import "./dialog.styles.css";
import { useDialogLogic } from "./useDialogLogic";

export function Dialog() {
  const { open, payload, close } = useDialogLogic();
  const dialogRef = useRef(null);
  const [showBackButton, setShowBackButton] = useState(false);

  const gameName = String(payload?.game ?? "").toLowerCase();
  const isSoletra = gameName === "soletra";
  const showCorrectWord = gameName === "forca" || gameName === "labirinto";
  const backButtonDelay = isSoletra ? 0 : 2000;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open || !payload) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [open, payload]);

  useEffect(() => {
    if (!open || !payload) {
      setShowBackButton(false);
      return undefined;
    }

    setShowBackButton(backButtonDelay === 0);
    if (backButtonDelay === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowBackButton(true);
    }, backButtonDelay);

    return () => window.clearTimeout(timeoutId);
  }, [open, payload, backButtonDelay]);

  if (!open || !payload) return null;

  const {
    game,
    score,
    remainingSeconds,
    elapsedSeconds,
    totalScore,
    targetScore,
    won,
    timedOut,
    correctWord,
    secret,
    word,
  } = payload;

  const displayCorrectWord = String(correctWord ?? secret ?? word ?? "").trim();

  const displayScore = Number.isFinite(Number(totalScore))
    ? Number(totalScore)
    : Number(score ?? 0);
  const displayElapsedSeconds = Number.isFinite(Number(elapsedSeconds))
    ? Math.max(0, Math.floor(Number(elapsedSeconds)))
    : Math.max(0, Math.floor(Number(remainingSeconds ?? 0)));

  const handleBackToCadastro = () => {
    close();
    try {
      window.dispatchEvent(
        new CustomEvent("app:navigate", { detail: { to: "cadastro" } }),
      );
    } catch (e) {
      console.warn("navigation event dispatch failed", e);
    }
  };

  const handleCancel = (event) => {
    event.preventDefault();
    close();
  };

  return (
    <>
      <style>{`
        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.3) !important;
          -webkit-backdrop-filter: blur(11px) !important;
          backdrop-filter: blur(11px) !important;
        }
        .dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.3) !important;
          -webkit-backdrop-filter: blur(11px) !important;
          backdrop-filter: blur(11px) !important;
        }
      `}</style>
      <dialog ref={dialogRef} className="dialog" onCancel={handleCancel}>
        <div>
          <h3 className="voce">
            {won ? (
              <>
                Voce <span className="venceu">venceu!</span>
              </>
            ) : (
              <>
                Voce <span className="venceu perdeu">perdeu!</span>
              </>
            )}
          </h3>
        </div>

        {showCorrectWord && (
          <div className="pontuacaoTempo">
            <div className="frase">
              Palavra correta:{" "}
              <div className="pontuacao">
                <span className="pontuacaoSpan">
                  {displayCorrectWord || "-"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pontuacaoTempo">
          <div className="frase">
            Sua pontuação:{" "}
            <div className="pontuacao">
              <span className="pontuacaoSpan">{displayScore} pontos</span>
            </div>
          </div>
        </div>

        <div className="pontuacaoTempo">
          <div className="frase">
            Seu tempo:{" "}
            <div className="tempo">
              <span className="pontuacaoSpan">{displayElapsedSeconds}s</span>
            </div>
          </div>
        </div>

        {showBackButton && (
          <button className="voltar-ao-menu" onClick={handleBackToCadastro}>
            Voltar ao Cadastro
          </button>
        )}
      </dialog>
    </>
  );
}
