import { Tabela } from "../tabela/Tabela";
import { Titulo } from "../titulo/Titulo";
import "./cardRanking.styles.css";

export function CardRanking({ classe, titulo, subtitulo, dados }) {
  const usuariosExibidos =
    Array.isArray(dados) && dados.length > 0 ? dados : listaDeUsuariosDefault;

  return (
    <section className={classe}>
      {titulo && (
        <Titulo
          texto={titulo}
          classe="textoTitulo"
          classeSection="titulo-section"
          botao={false}
          background={false}
        />
      )}
      {subtitulo && <p className="subtituloRanking">{subtitulo}</p>}
      <Tabela dados={usuariosExibidos} />
    </section>
  );
}
