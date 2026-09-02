import "./titulo.styles.css";
import { Button } from "../componentsTag/button";

export function Titulo({
  texto,
  classe,
  botao,
  background,
  borda,
  classeSection,
}) {
  const mostrarBotao = botao ?? false;
  const mostrarBackground = background ?? false;
  const mostrarBorda = borda ?? false;

  const sectionClass =
    classeSection ??
    `${mostrarBackground ? "titulo-section" : "titulo-sectionSemBackground"}` +
      `${mostrarBorda ? " titulo-sectionBorda" : ""}`;

  return (
    <section className={sectionClass}>
      <span className={classe}>{texto}</span>
      {mostrarBotao && <Button />}
      {mostrarBotao && <Button />}
    </section>
  );
}
