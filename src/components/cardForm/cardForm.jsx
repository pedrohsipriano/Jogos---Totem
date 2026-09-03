import { useState, useEffect } from "react";
import { Button } from "../componentsTag/button";
import { Titulo } from "../titulo/Titulo";
import "../jogos/AperteOPasso/whacGame.style.css";
import {
  checkPlayerPhone,
  registerPlayer,
  getPlayer,
} from "../../lib/appDatabase";
import "./cardMenu.styles.css";
import Teclado from "../teclado/teclado";

const GAME_DESCRIPTIONS = {
  memory:
    "Encontre os pares de cartas iguais no menor tempo possível. Clique em uma carta para revelá-la e, em seguida, em outra. Complete o painel para acumular pontos!",
  hangman:
    "Adivinhe a palavra secreta escolhendo as letras. Cada erro custa uma vida. Complete a palavra antes que suas vidas acabem para somar pontos!",
  labirinto:
    "Guie o personagem pelo labirinto coletando as letras na ordem correta para soletrar a palavra indicada. Evite becos sem saída!",
  quiz: "Responda às perguntas de múltipla escolha sobre varejo. Escolha a resposta correta o mais rápido possível para pontuar mais!",
  catch:
    "Mova a cesta para a esquerda e direita para coletar os itens bons e especiais que caem do topo. Desvie dos itens ruins para não perder pontos!",
  whac: "Clique rapidamente nos alvos corretos assim que eles aparecerem na tela para ganhar pontos. Evite clicar nos distratores para não perder pontuação!",
  wordsearch:
    "Encontre as palavras escondidas na grade de letras. Pressione a primeira letra e arraste até o final da palavra na vertical ou horizontal.",
  soletra:
    "Leia a definição da palavra, depois digite a grafia exata usando o teclado virtual. Acerte para avançar nos rounds e somar pontos!",
};

export function CardForm({
  classe,
  titulo,
  subtitulo,
  onStartChallenge,
  selectedGame = {},
  blocked = false,
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isKnownPhone, setIsKnownPhone] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState("numeroTelefone");

  const whacTargetIcon = "OMNI";
  const whacTimeLimitSeconds = selectedGame?.config?.timeLimitSeconds ?? 30;

  useEffect(() => {
    const isLimitActive =
      Number(selectedGame?.config?.limitOneAttempt) === 1 ||
      selectedGame?.config?.limitOneAttempt === true ||
      String(selectedGame?.config?.limitOneAttempt) === "true";
    if (!isLimitActive) {
      setShowLimitAlert(false);
    }
  }, [selectedGame?.config?.limitOneAttempt]);

  useEffect(() => {
    const handleFocus = (e) => {
      if (e.target.id === "numeroTelefone" || e.target.id === "nomeJogador") {
        setActiveInput(e.target.id);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  useEffect(() => {
    const handleVirtualKey = (e) => {
      if (blocked) return;
      const { key } = e.detail;
      if (!activeInput) return;

      if (activeInput === "numeroTelefone") {
        if (key === "Backspace") {
          const raw = String(phone).replace(/\D/g, "");
          const nextVal = raw.slice(0, -1);
          handlePhoneChange(nextVal);
        } else if (key === "Clear") {
          handlePhoneChange("");
        } else if (/^\d$/.test(key)) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.length < 11) {
            handlePhoneChange(raw + key);
          }
        }
      } else if (activeInput === "nomeJogador") {
        if (key === "Backspace") {
          handleNameChange(name.slice(0, -1));
        } else if (key === "Clear") {
          handleNameChange("");
        } else if (key === "Space") {
          handleNameChange(name + " ");
        } else if (key.length === 1) {
          handleNameChange(name + key);
        }
      }
    };

    window.addEventListener("virtual-keyboard:keypress", handleVirtualKey);
    return () =>
      window.removeEventListener("virtual-keyboard:keypress", handleVirtualKey);
  }, [activeInput, phone, name]);

  const maskPhone = (value) => {
    const digits = String(value ?? "")
      .replace(/\D/g, "")
      .slice(0, 11);

    if (!digits) return "";

    const ddd = digits.slice(0, 2);
    const firstPart = digits.slice(2, 7);
    const secondPart = digits.slice(7, 11);

    if (digits.length <= 2) {
      return `(${ddd}`;
    }

    if (digits.length <= 7) {
      return `(${ddd}) ${firstPart}`;
    }

    return `(${ddd}) ${firstPart}-${secondPart}`;
  };

  const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");

  const [eventClosedMessage, setEventClosedMessage] = useState("");

  // Verifica se o telefone já está registrado pontualmente ao atingir 11 dígitos
  const handlePhoneChange = async (value) => {
    if (blocked) return;
    const maskedPhone = maskPhone(value);
    setPhone(maskedPhone);
    const normalized = normalizePhone(maskedPhone);
    setEventClosedMessage("");

    if (normalized.length === 11) {
      try {
        const res = await checkPlayerPhone(normalized, selectedGame?.code);
        if (res && res.eventClosed && !res.isAdmin) {
          setEventClosedMessage(
            "O evento foi encerrado. Os jogos estão desativados para o público geral.",
          );
          setIsKnownPhone(false);
          setName("");
          return;
        }

        const isLimitActive =
          Number(selectedGame?.config?.limitOneAttempt) === 1 ||
          selectedGame?.config?.limitOneAttempt === true ||
          String(selectedGame?.config?.limitOneAttempt) === "true";
        if (res.attempts > 0 && isLimitActive) {
          setShowLimitAlert(true);
          setPhone("");
          setName("");
          setIsKnownPhone(false);
          return;
        }

        if (res && res.exists) {
          setIsKnownPhone(true);
          setName(res.name || "Jogador");
        } else {
          setIsKnownPhone(false);
          setName("");
          // Foca automaticamente no campo de Nome se for novo cadastro
          setTimeout(() => {
            const nomeInput = document.getElementById("nomeJogador");
            if (nomeInput) nomeInput.focus();
          }, 60);
        }
      } catch (err) {
        setIsKnownPhone(false);
        setName("");
        setTimeout(() => {
          const nomeInput = document.getElementById("nomeJogador");
          if (nomeInput) nomeInput.focus();
        }, 60);
      }
    } else {
      setIsKnownPhone(false);
      setName("");
      setEventClosedMessage("");
    }
  };

  const handleNameChange = (value) => {
    setName(value || "");
  };

  const canPlay =
    !eventClosedMessage &&
    normalizePhone(phone).length === 11 &&
    (isKnownPhone || (name || "").trim() !== "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blocked) {
      alert("Por favor, atualize a página antes de iniciar o jogo.");
      return;
    }
    if (canPlay) {
      const normalized = normalizePhone(phone);

      // Validação final e redundante de tentativa única antes de iniciar
      try {
        const res = await checkPlayerPhone(normalized, selectedGame?.code);
        const isLimitActive =
          Number(selectedGame?.config?.limitOneAttempt) === 1 ||
          selectedGame?.config?.limitOneAttempt === true ||
          String(selectedGame?.config?.limitOneAttempt) === "true";
        if (res.attempts > 0 && isLimitActive) {
          setShowLimitAlert(true);
          setPhone("");
          setName("");
          setIsKnownPhone(false);
          return;
        }
      } catch (err) {
        console.error("Erro ao validar tentativa única:", err);
      }

      let playerData = null;
      try {
        if (!isKnownPhone) {
          playerData = await registerPlayer(name.trim(), normalized);
        } else {
          playerData = await getPlayer(normalized);
        }
      } catch (err) {
        console.error("Erro ao autenticar jogador:", err);
      }

      const finalPlayer = playerData || {
        phone: normalized,
        name: name.trim(),
      };

      onStartChallenge?.(finalPlayer);
    }
  };

  return (
    <section className={classe}>
      <Titulo
        texto={titulo}
        classe="textoTitulo"
        botao={false}
        background={false}
        borda={false}
      />
      <p className="subtituloJogo">{subtitulo}</p>
      <form
        className="formSection"
        id="FormularioDeCadastro"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <input
          type="tel"
          name="numeroTelefone"
          id="numeroTelefone"
          className="inputCardForm"
          placeholder="Telefone"
          pattern="\(\d{2}\) \d{5}-\d{4}"
          title="Digite um telefone no formato (99) 99999-9999"
          value={phone}
          onChange={(e) => !blocked && handlePhoneChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          inputMode="none"
          readOnly
          required
        />
        {!isKnownPhone && (
          <input
            type="text"
            name="nomeJogador"
            id="nomeJogador"
            className="inputCardForm"
            placeholder="Nome"
            value={name}
            onChange={(e) => !blocked && handleNameChange(e.target.value)}
            disabled={blocked || normalizePhone(phone).length < 11}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            inputMode="none"
            readOnly
            required
          />
        )}
        {isKnownPhone && (
          <p className="subtituloJogo">
            Cadastro encontrado. Bem-vindo de volta, {name}.
          </p>
        )}
        {eventClosedMessage && (
          <p
            className="subtituloJogo"
            style={{ color: "#F60085", fontWeight: "bold" }}
          >
            {eventClosedMessage}
          </p>
        )}
        {!canPlay && !eventClosedMessage && (
          <p className="subtituloJogo">Preencha para liberar os jogos.</p>
        )}
        {!isKnownPhone && <Teclado />}
        {selectedGame?.code && GAME_DESCRIPTIONS[selectedGame.code] && (
          <div className="instrucoes-container">
            <h4 className="instrucoes-titulo">Como jogar:</h4>
            <p className="instrucoes-texto">
              {GAME_DESCRIPTIONS[selectedGame.code]}
            </p>
            {selectedGame.code === "catch" && (
              <div className="estantePontos1">
                <div className="pontuacao1">
                  <span>Pontuação</span>
                </div>
                <div className="itensLegenda1">
                  <div className="imgdiv">
                    <img
                      src="/images/dinheirospecial.png"
                      alt="Item Especial"
                    />{" "}
                    +20
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
            )}
            {selectedGame.code === "whac" && (
              <div className="whac-intro1">
                <br />
                <p className="whac-intro-text1">Seu alvo é:</p>
                {/* EXIBIÇÃO EM DESTAQUE DO ÍCONE ALVO DA PARTIDA */}
                <div className="whac-target-display">
                  <br />
                  {whacTargetIcon === "OMNI" ? (
                    <img
                      src="/images/logo.png"
                      alt="OmniVarejo"
                      className="whac-logo-img"
                    />
                  ) : (
                    whacTargetIcon
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <Button
          type="submit"
          classe="botaoComecarDesafio"
          texto={blocked ? "Regras obsoletas" : "Começar o desafio"}
          classeTexto="textoBotaoComecarDesafio"
          disabled={blocked || !canPlay}
        />
      </form>

      {showLimitAlert && (
        <div className="alert-rules-backdrop">
          <div
            className="alert-rules-outdated"
            style={{
              position: "relative",
              top: "auto",
              left: "auto",
              transform: "none",
              animation: "none",
            }}
          >
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <strong>Atenção:</strong> Você já jogou este jogo!
            </p>
            <p>O limite é de apenas 1 tentativa por pessoa.</p>
            <button type="button" onClick={() => setShowLimitAlert(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
