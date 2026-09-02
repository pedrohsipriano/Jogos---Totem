import { useState, useEffect, useRef } from "react";
import { getDashboardStats, resetDashboardStats, updateGiftsConfig } from "../lib/appDatabase";
import GameNav from "../components/gameNav/GameNav";

export function Dashboard({ onBackToMenu, onBackToCadastro, onOpenAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [localTotalGifts, setLocalTotalGifts] = useState("");
  const [localGiftMode, setLocalGiftMode] = useState("multiple");
  const [savingGifts, setSavingGifts] = useState(false);
  const giftInputRef = useRef(null); // Ref to avoid overwriting input while typing

  const loadStats = async () => {
    try {
      const stats = await getDashboardStats();
      setData(stats);
      if (stats?.gifts && document.activeElement !== giftInputRef.current) {
        setLocalTotalGifts(stats.gifts.totalGifts);
        setLocalGiftMode(stats.gifts.giftMode || "multiple");
      }
    } catch (err) {
      setError("Não foi possível carregar as estatísticas da dashboard. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGifts = async (e) => {
    e.preventDefault();
    setSavingGifts(true);
    try {
      await updateGiftsConfig({ 
        totalGifts: Number(localTotalGifts) || 0, 
        giftMode: localGiftMode 
      });
      await loadStats();
      alert("Configuração de brindes salva!");
    } catch (err) {
      alert("Erro ao salvar configuração de brindes.");
    } finally {
      setSavingGifts(false);
    }
  };

  const handleResetStats = async () => {
    const confirm = window.confirm(
      "Deseja realmente zerar todos os dados de partidas, vitórias e pontuações de todos os jogadores? Esta ação é irreversível!",
    );
    if (!confirm) return;

    setLoading(true);
    setError("");
    try {
      await resetDashboardStats();
      await loadStats();
      alert("Estatísticas e pontuações zeradas com sucesso!");
    } catch (err) {
      setError("Não foi possível zerar os dados das estatísticas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadStats();
    // Atualiza a dashboard a cada 10 segundos de forma silenciosa
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <GameNav
        currentScreen="dashboard"
        onBackToMenu={onBackToMenu}
        onBackToCadastro={onBackToCadastro}
        onOpenAdmin={onOpenAdmin}
      />
      <div className="dashboard-container">
        <header className="panel admin-hero" style={{ marginBottom: "20px" }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Estatísticas do Evento</p>
              <h2>Dashboard de Jogos</h2>
            </div>
            <div className="admin-section-actions">
              <button className="ghost" type="button" onClick={loadStats}>
                Atualizar
              </button>
              <button
                className="ghost btn-danger"
                type="button"
                onClick={handleResetStats}
              >
                Zerar Estatísticas
              </button>
            </div>
          </div>

          {/* Resumo visual de contagens gerais que foram removidas do Admin CRUD */}
          {data?.counts && (
            <div className="admin-summary" style={{ marginTop: "20px" }}>
              <div className="admin-summary-card">
                <span>Usuários Cadastrados</span>
                <strong>{data.counts.players}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Jogos Cadastrados</span>
                <strong>{data.counts.games}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Palavras no Banco</span>
                <strong>{data.counts.words}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Perguntas de Quiz</span>
                <strong>{data.counts.quizQuestions}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Frases de Soletra</span>
                <strong>{data.counts.soletraRounds}</strong>
              </div>
              <div className="admin-summary-card highlighted">
                <span>Total de Partidas</span>
                <strong>{data.counts.totalPlayedAll}</strong>
              </div>
            </div>
          )}

          {loading && !data && (
            <p className="muted">Carregando estatísticas...</p>
          )}
          {error && <p className="admin-error">{error}</p>}
        </header>

        {/* PAINEL DE COMPARATIVO DE ENGAJAMENTO (POPULARIDADE) */}
        {data?.stats && data.stats.length > 0 && (
          <div className="engagement-panel panel">
            <div className="panel-head">
              <h3>📊 Popularidade dos Jogos (Engajamento)</h3>
            </div>
            <div className="engagement-bars-container">
              {(() => {
                const maxPlayed = Math.max(
                  ...data.stats.map((g) => g.totalPlayed || 0),
                  1,
                );
                return data.stats.map((game) => {
                  const percentage = Math.round(
                    ((game.totalPlayed || 0) / maxPlayed) * 100,
                  );
                  return (
                    <div key={game.gameId} className="engagement-bar-row">
                      <span className="engagement-game-name">
                        {game.gameName}
                      </span>
                      <div className="engagement-bar-track">
                        <div
                          className="engagement-bar-fill"
                          style={{ width: `${percentage}%` }}
                        >
                          <span className="engagement-bar-value">
                            {game.totalPlayed} jogadas
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {data?.gifts && (
          <div className="panel dashboard-gifts-panel">
            <div className="panel-head">
              <h3>🎁 Controle de Brindes</h3>
            </div>
            <div className="dashboard-gifts-content">
              <div className="dashboard-gifts-stats-col">
                <h4 className="dashboard-gifts-title">Estatísticas de Entrega</h4>
                <div className="admin-summary gifts-summary">
                  <div className="admin-summary-card">
                    <span>Total Inicial</span>
                    <strong>{data.gifts.totalGifts}</strong>
                  </div>
                  <div className="admin-summary-card">
                    <span>Brindes Entregues</span>
                    <strong className="gifts-given-value">{data.gifts.giftsGiven}</strong>
                  </div>
                  <div className="admin-summary-card highlighted">
                    <span>Restantes na Gaveta</span>
                    <strong className={(data.gifts.totalGifts - data.gifts.giftsGiven) <= 0 ? "gifts-empty" : "gifts-available"}>
                      {Math.max(0, data.gifts.totalGifts - data.gifts.giftsGiven)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="dashboard-gifts-form-col">
                <h4 className="dashboard-gifts-title">Configurar Distribuição</h4>
                <form onSubmit={handleSaveGifts} className="dashboard-gifts-form">
                  <div className="time-field">
                    <label className="gifts-label">Total de Brindes (Reposição)</label>
                    <input 
                      ref={giftInputRef}
                      type="number" 
                      min="0"
                      value={localTotalGifts} 
                      onChange={e => setLocalTotalGifts(e.target.value)}
                    />
                  </div>
                  <div className="time-field">
                    <label className="gifts-label">Regra de Distribuição</label>
                    <select 
                      value={localGiftMode} 
                      onChange={e => setLocalGiftMode(e.target.value)}
                    >
                      <option value="one_per_person">1 por Pessoa (ganha no 1º jogo que vencer)</option>
                      <option value="one_per_game">1 por Jogo (pode ganhar 1 no Labirinto e 1 no Quiz)</option>
                      <option value="multiple">Múltiplos (sempre que vencer, ganha 1 brinde)</option>
                    </select>
                  </div>
                  <div className="dashboard-gifts-form-actions">
                    <button type="submit" className="ghost" disabled={savingGifts}>
                      {savingGifts ? "Salvando..." : "Salvar Configuração"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {data?.stats && (
          <div className="dashboard-games-grid">
            {data.stats.map((game) => (
              <div className="dashboard-game-card panel" key={game.gameId}>
                <div className="game-card-header">
                  <h3>{game.gameName}</h3>
                  <span className={`game-trend-badge ${game.trend}`}>
                    {game.trend === "ganhando"
                      ? "Ganhando mais 📈"
                      : "Perdendo mais 📉"}
                  </span>
                </div>

                <div className="game-stats-row">
                  <div className="game-stat-item">
                    <span>Partidas Jogadas</span>
                    <strong>{game.totalPlayed}</strong>
                  </div>
                  <div className="game-stat-item">
                    <span>Total de Vitórias</span>
                    <strong>{game.wins}</strong>
                  </div>
                  <div className="game-stat-item rate-item">
                    <span>Taxa de Vitória</span>
                    {(() => {
                      const winRate =
                        game.totalPlayed > 0
                          ? Math.round((game.wins / game.totalPlayed) * 100)
                          : 0;
                      return (
                        <div className="success-rate-container">
                          <div className="success-rate-track">
                            <div
                              className={`success-rate-fill ${
                                winRate >= 65
                                  ? "high"
                                  : winRate >= 35
                                    ? "medium"
                                    : "low"
                              }`}
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                          <strong className="success-rate-value">
                            {winRate}%
                          </strong>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="game-top-players">
                  <h4>🏆 Maiores Pontuadores (Top 3)</h4>
                  {game.top3.length === 0 ? (
                    <p className="muted-small">
                      Nenhuma pontuação registrada neste jogo.
                    </p>
                  ) : (
                    <ol className="top-players-list">
                      {game.top3.map((player, idx) => (
                        <li
                          key={idx}
                          className={`top-player-item position-${idx + 1}`}
                        >
                          <span className="player-rank">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                          </span>
                          <span className="player-name">{player.name}</span>
                          <span className="player-points">
                            {player.points} pts
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;
