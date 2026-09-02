import { useState, useEffect } from "react";
import { CardForm } from "../components/cardForm/cardForm";
import GameNav from "../components/gameNav/GameNav";
import { getAdminMenuRecords, getGameRulesVersion } from "../lib/appDatabase";
import { buildGameConfig } from "../utils/gameConfig";

export function Cadastro({
  selectedGame = {},
  onStartChallenge,
  onBackToMenu,
  onBackToCadastro,
  refreshSelectedGameConfig,
  onOpenDashboard,
  onOpenAdmin,
}) {
  const [isConfigOutdated, setIsConfigOutdated] = useState(false);
  const gameTitle = selectedGame.title;

  useEffect(() => {
    if (!selectedGame?.code) return;

    const key = "game_rules_outdated_" + selectedGame.code;

    // Verifica de imediato o localStorage
    if (localStorage.getItem(key) === "true") {
      setIsConfigOutdated(true);
    }

    const handleRulesUpdate = async () => {
      try {
        const records = await getAdminMenuRecords();
        const games = Array.isArray(records?.games) ? records.games : [];
        const game = games.find(
          (entry) => String(entry.code ?? "").toLowerCase() === String(selectedGame.code).toLowerCase()
        );
        if (!game) return;

        const latestConfig = buildGameConfig(game, records?.gameSettings ?? []);
        const currentConfig = selectedGame.config ?? {};

        const importantKeys = Array.from(new Set([
          ...Object.keys(currentConfig),
          ...Object.keys(latestConfig)
        ])).filter(k => k !== "limitOneAttempt");

        const importantChanged = importantKeys.some(k => {
          return JSON.stringify(currentConfig[k]) !== JSON.stringify(latestConfig[k]);
        });

        if (importantChanged) {
          localStorage.setItem(key, "true");
          setIsConfigOutdated(true);
        } else {
          // Atualiza o estado global silenciosamente (destrava ou trava o limitOneAttempt sem F5)
          await refreshSelectedGameConfig(selectedGame.code);
        }
      } catch (err) {
        console.warn("Erro ao processar atualização de regras:", err);
      }
    };

    // Escuta evento local de regras alteradas (no mesmo Totem)
    const handleRulesChange = (e) => {
      const code = String(e?.detail?.gameCode ?? "").toLowerCase();
      if (code === String(selectedGame.code).toLowerCase()) {
        handleRulesUpdate();
      }
    };

    // Polling a cada 3 segundos de versão (para alterações vindas de outros dispositivos)
    const checkVersion = async () => {
      try {
        const versionData = await getGameRulesVersion(selectedGame.code);
        const latestVersion = versionData?.version || 1;
        const currentRulesVersion = selectedGame.rulesVersion || 1;

        if (latestVersion > currentRulesVersion) {
          await handleRulesUpdate();
        }
      } catch (err) {
        console.warn("Erro ao verificar versão das regras via polling leve:", err);
      }
    };

    window.addEventListener("app:gameRulesChanged", handleRulesChange);
    const interval = setInterval(checkVersion, 3000);
    
    return () => {
      window.removeEventListener("app:gameRulesChanged", handleRulesChange);
      clearInterval(interval);
    };
  }, [selectedGame, refreshSelectedGameConfig]);

  const handleReload = () => {
    if (selectedGame?.code) {
      localStorage.removeItem("game_rules_outdated_" + selectedGame.code);
    }
    window.location.reload();
  };

  return (
    <div className={`cadastro-page ${selectedGame?.code === "wordsearch_mulher" || selectedGame?.code === "quiz_mulher" ? "mulher-theme" : ""}`}>
      <GameNav
        currentScreen="cadastro"
        onBackToMenu={onBackToMenu}
        onBackToCadastro={onBackToCadastro}
        onOpenDashboard={onOpenDashboard}
        onOpenAdmin={onOpenAdmin}
      />
      
      {isConfigOutdated && (
        <div className="alert-rules-backdrop">
          <div className="alert-rules-outdated" style={{ position: "relative", top: "auto", left: "auto", transform: "none", animation: "none" }}>
            <p>
              ⚠️ <strong>Atenção:</strong> As regras de pontuação ou tentativas deste jogo foram atualizadas pelo administrador.
            </p>
            <p>
              Por favor, atualize a página para garantir que sua pontuação seja registrada corretamente.
            </p>
            <button type="button" onClick={handleReload}>
              Atualizar Página
            </button>
          </div>
        </div>
      )}

      <CardForm
        classe="CardFormSection"
        titulo={gameTitle}
        subtitulo="O participante deve preencher nome e telefone antes de jogar. Assim, a pontuação pode ser registrada corretamente no rank."
        onStartChallenge={onStartChallenge}
        selectedGame={selectedGame}
        blocked={isConfigOutdated}
      />
    </div>
  );
}

export default Cadastro;
