import { useEffect, useState } from "react";
import { CardRanking } from "../components/cardRanking/CardRanking";

export function Ranking({ onBackToMenu }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const { getRanking } = await import("../lib/appDatabase");
        const data = await getRanking();
        setRanking(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar ranking:", err);
        // Tenta recuperar do localStorage como fallback
        try {
          const fallback = localStorage.getItem("jogos_fallback_ranking");
          if (fallback) {
            setRanking(JSON.parse(fallback));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, []);

  // Mapeia dados do API para o formato esperado pela CardRanking
  const usuariosFormatados = ranking.map((player) => ({
    id: player.id,
    nome: player.name || "Jogador Desconecido",
    numero: player.phone || "",
    pontos: player.totalPoints || 0,
    avatar: player.avatar || "",
  }));

  return (
    <section className="cardRankingSection">
      <div className="ranking-header">
        <h2 className="textoTitulo">Rank Total</h2>
      </div>
      <p className="subtituloJogo">
        Aqui é exibida a soma de pontos de todos os jogos que o participante já
        jogou, formando sua pontuação total no ranking.
      </p>

      {loading ? (
        <p>Carregando ranking...</p>
      ) : usuariosFormatados.length > 0 ? (
        <CardRanking
          classe=""
          titulo=""
          subtitulo=""
          dados={usuariosFormatados}
        />
      ) : (
        <p style={{ marginTop: "20px", color: "#999" }}>
          Nenhum jogador registrado ainda.
        </p>
      )}
    </section>
  );
}

export default Ranking;
