import { useEffect, useState } from "react";
import { CardMenu } from "../components/cardMenu/CardMenu";
import { Titulo } from "../components/titulo/Titulo";
import GameNav from "../components/gameNav/GameNav";
import { getAdminMenuRecords, loadAppDatabase } from "../lib/appDatabase";
import { buildGameConfig } from "../utils/gameConfig";

export function Home({ onSelectGame, onOpenAdmin, onOpenDashboard }) {
  const [games, setGames] = useState([]);
  const [gameSettings, setGameSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRemoteMode, setIsRemoteMode] = useState(false);

  // Hidratação inicial: verifica se o backend está disponível
  useEffect(() => {
    const hydrateApp = async () => {
      try {
        const { isRemote } = await loadAppDatabase();
        setIsRemoteMode(isRemote);
      } catch (err) {
        setIsRemoteMode(false);
      }
    };
    hydrateApp();
  }, []);

  // DEBUG: log composed config to help trace why admin settings not applied
  // try {
  //   // eslint-disable-next-line no-console
  //   console.log("[DEBUG] Starting game", {
  //     gameId: game.id,
  //     code: game.code,
  //     defaults,
  //     adminConfig,
  //     config,
  //   });
  // } catch (e) {}

  // Carregamento de jogos e configurações
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const records = await getAdminMenuRecords();
        if (!active) return;
        const gamesList = Array.isArray(records?.games) ? records.games : [];
        setGames(gamesList);
        setGameSettings(
          Array.isArray(records?.gameSettings) ? records.gameSettings : [],
        );
      } catch {
        if (!active) return;
        setGames([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  // Recarrega `gameSettings` quando o Admin altera registros (emitido por AdminHub)
  useEffect(() => {
    const handler = async (e) => {
      try {
        const records = await getAdminMenuRecords();
        setGameSettings(
          Array.isArray(records?.gameSettings) ? records.gameSettings : [],
        );
        // also refresh games list if changed
        setGames(Array.isArray(records?.games) ? records.games : []);
      } catch {
        // ignore
      }
    };

    window.addEventListener("app:adminRecordsChanged", handler);
    return () => window.removeEventListener("app:adminRecordsChanged", handler);
  }, []);

  const sortedGames = [...games].sort((a, b) => {
    if (a.code === "memory") return -1;
    if (b.code === "memory") return 1;
    return String(a.name ?? a.code ?? "").localeCompare(
      String(b.name ?? b.code ?? ""),
    );
  });

  const handleStartGame = (payload = {}) => {
    const gameKey = payload.code ?? payload.id ?? payload.gameId ?? payload;
    const game = sortedGames.find(
      (g) =>
        String(g.id) === String(gameKey) || String(g.code) === String(gameKey),
    );
    if (!game) return;

    const config = buildGameConfig(game, gameSettings);

    onSelectGame?.({
      code: game.code,
      title: game.name ?? game.code,
      config,
    });
  };

  return (
    <>
      <GameNav
        currentScreen="menu"
        onOpenAdmin={onOpenAdmin}
        onOpenDashboard={onOpenDashboard}
      />
      <Titulo
        texto="Escolha o seu desafio"
        classe="textoTitulo"
        botao={false}
        background={true}
      />
      <section className="CardMenu-section">
        {loading ? (
          <p>Carregando jogos do banco...</p>
        ) : (
          <div className="CardMenu-section">
            {sortedGames.map((game) => {
              return (
                <CardMenu
                  key={game.id}
                  gameId={game.id}
                  title={game.name ?? game.code}
                  code={game.code}
                  onStartGame={handleStartGame}
                />
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default Home;
