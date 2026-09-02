import "./rankingTable.style.css";
import { formatPhoneDisplay } from "../../utils/phone";

/**
 * COMPONENTE DE TABELA DE RANKING GERAL (RankingTable.jsx)
 * Responsável por renderizar a classificação geral acumulada dos jogadores na aplicação.
 * Exibe as colunas de Nome, Telefone e Pontos totais (`totalPoints`) ordenados.
 * Caso a lista de ranking esteja vazia, exibe um aviso incentivando a participação.
 *
 * @param {Object} props - Propriedades do componente.
 * @param {Array} props.ranking - Lista de objetos representando os jogadores e suas respectivas pontuações globais.
 */
export default function RankingTable({ ranking = [] }) {
  return (
    // Contêiner principal do ranking em formato de painel
    <section className="panel">
      {/* CABEÇALHO DO PAINEL DE RANKING */}
      <div className="panel-head">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Ranking geral por pessoa</h2>
        </div>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DA TABELA OU AVISO DE LISTA VAZIA */}
      {ranking.length === 0 ? (
        <p className="muted">Jogue para entrar no ranking.</p>
      ) : (
        <div className="table">
          {/* CABEÇALHO DAS COLUNAS (Nome, Telefone, Pontos) */}
          <div className="table-head">
            <span>Nome</span>
            <span>Telefone</span>
            <span>Pontos</span>
          </div>

          {/* ITERAÇÃO SOBRE OS REGISTROS DO RANKING */}
          {ranking.map((row) => (
            <div key={row.id} className="table-row">
              <span>
                {row.avatar ? (
                  (() => {
                    const isUrl = row.avatar.startsWith("http://") || row.avatar.startsWith("https://") || row.avatar.startsWith("/") || row.avatar.startsWith("data:");
                    return isUrl ? (
                      <img src={row.avatar} alt="Avatar" className="ranking-avatar-img" />
                    ) : (
                      `${row.avatar} `
                    );
                  })()
                ) : ""}
                {row.name}
              </span>
              <span>{formatPhoneDisplay(row.phone)}</span>
              <span>{row.totalPoints ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
