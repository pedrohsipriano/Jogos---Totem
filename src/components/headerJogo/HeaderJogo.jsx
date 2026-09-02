import GameNav from "../gameNav/GameNav";
import { Titulo } from "../titulo/Titulo";
import "./headerJogo.styles.css";
import formatSeconds from "../../utils/time";

export function HeaderJogo({
  title = "",
  subtitle = "",
  time = 0,
  points = 0,
  onBackToMenu,
  onBackToCadastro,
  gameCode = "",
}) {
  // `time` pode ser um número (segundos, possivelmente float) ou uma string já formatada.
  // Normalize time: accept number (preferred) or attempt to parse numeric from string.
  let timeDisplay = "00";
  if (typeof time === "number") {
    timeDisplay = formatSeconds(time);
  } else if (typeof time === "string") {
    const parsed = parseFloat(time.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) timeDisplay = formatSeconds(parsed);
    else timeDisplay = "00";
  }

  const isMulher = (title && title.toLowerCase().includes("mulher")) || gameCode === "wordsearch_mulher" || gameCode === "quiz_mulher";

  return (
    <>
      <GameNav
        currentScreen="jogos"
        onBackToMenu={onBackToMenu}
        onBackToCadastro={onBackToCadastro}
      />
      <section className={`headerJogoSection ${isMulher ? "no-margin" : ""}`}>
        {isMulher && <img src="/images/CDL Mulher - Branco.png" alt="Logo CDL Mulher" className="header-logo" />}
        <Titulo
          texto={title}
          classe="TituloJogo"
          botao={false}
          background={false}
          borda={true}
        />
        <section className="pontoTempoSction">
          <section className="tempoSection">
            <p className="tempo">{timeDisplay}</p>
          </section>
          <section className="pontuacaoSection">
            <p className="pontuacao">Pontos: {points}</p>
          </section>
        </section>
        <p className="headerJogoSubtitle">{subtitle}</p>
      </section>
    </>
  );
}

export default HeaderJogo;
