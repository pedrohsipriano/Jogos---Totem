import { useEffect, useState } from "react";
import "./teclado.styles.css";

const ROW_NUM = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_QWERTY_1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const ROW_QWERTY_2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const ROW_QWERTY_3 = ["Z", "X", "C", "V", "B", "N", "M"];

export function Teclado() {
  const [activeInput, setActiveInput] = useState("numeroTelefone");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleFocus = (event) => {
      const id = event.target.id;
      if (id === "numeroTelefone" || id === "nomeJogador") {
        setActiveInput(id);
      }
    };

    const handleClick = (event) => {
      const id = event.target.id;
      if (id === "numeroTelefone" || id === "nomeJogador") {
        setVisible(true);
      }
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const handleKeyPress = (key) => {
    // Garante focar no input antes de enviar o caractere
    const inputElement = document.getElementById(activeInput);
    if (inputElement) {
      inputElement.focus();
    }

    // Dispara evento global de digitação que o CardForm escuta
    window.dispatchEvent(
      new CustomEvent("virtual-keyboard:keypress", {
        detail: { key },
      })
    );
  };

  const handleTouchStart = (e) => {
    e.currentTarget.classList.add("is-pressed");
  };

  const handleTouchEnd = (e) => {
    e.currentTarget.classList.remove("is-pressed");
  };

  if (!visible) return null;

  return (
    <div className="teclado-virtual">
      {/* Indicador de campo focado */}
      <div className="teclado-header">
        <span>Digitando em: </span>
        <strong className="teclado-focus-label">
          {activeInput === "numeroTelefone" ? "Telefone" : "Nome"}
        </strong>
      </div>

      {activeInput === "numeroTelefone" ? (
        /* LAYOUT NUMÉRICO COMPACTO (TELEFONE) */
        <div className="teclado-grid teclado-numerico-grid">
          <div className="teclado-row">
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("1")}>1</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("2")}>2</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("3")}>3</button>
          </div>
          <div className="teclado-row">
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("4")}>4</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("5")}>5</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("6")}>6</button>
          </div>
          <div className="teclado-row">
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("7")}>7</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("8")}>8</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("9")}>9</button>
          </div>
          <div className="teclado-row">
            <button type="button" className="teclado-key key-special key-clear" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("Clear")}>Limpar</button>
            <button type="button" className="teclado-key key-num" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("0")}>0</button>
            <button type="button" className="teclado-key key-special key-backspace" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => handleKeyPress("Backspace")}>←</button>
          </div>
        </div>
      ) : (
        /* LAYOUT QWERTY COMPACTO (LETRAS) */
        <div className="teclado-grid">
          {/* Linha QWERTY 1 */}
          <div className="teclado-row">
            {ROW_QWERTY_1.map((char) => (
              <button
                type="button"
                key={char}
                className="teclado-key"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleKeyPress(char)}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Linha QWERTY 2 */}
          <div className="teclado-row">
            {ROW_QWERTY_2.map((char) => (
              <button
                type="button"
                key={char}
                className="teclado-key"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleKeyPress(char)}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Linha QWERTY 3 + Backspace */}
          <div className="teclado-row">
            {ROW_QWERTY_3.map((char) => (
              <button
                type="button"
                key={char}
                className="teclado-key"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleKeyPress(char)}
              >
                {char}
              </button>
            ))}
            <button
              type="button"
              className="teclado-key key-special key-backspace"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleKeyPress("Backspace")}
              aria-label="Apagar"
            >
              ←
            </button>
          </div>

          {/* Linha de controle inferior (Espaço e Limpar) */}
          <div className="teclado-row row-bottom">
            <button
              type="button"
              className="teclado-key key-special key-clear"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleKeyPress("Clear")}
            >
              Limpar
            </button>
            <button
              type="button"
              className="teclado-key key-special key-space"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleKeyPress("Space")}
            >
              Espaço
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teclado;
