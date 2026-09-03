import { useState, useEffect, useCallback } from "react";
import Home from "./pages/Home.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Jogos from "./pages/Jogos.jsx";
import Ranking from "./pages/Ranking.jsx";
import AdminHub from "./components/adminHub/AdminHubV2.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { Header } from "./components/header/index.jsx";
import { getAdminMenuRecords, getGameRulesVersion, clearAdminPassword, getAdminPassword, verifyAdminPassword, hasAdminPassword } from "./lib/appDatabase";
import { buildGameConfig } from "./utils/gameConfig";
import LockScreen from "./components/lockScreen/LockScreen.jsx";
import { LicenseScreen } from "./components/licenseScreen/LicenseScreen.jsx";
import { validateLicense, startClockHeartbeat, stopClockHeartbeat } from "./utils/licenseValidator.js";
import { applyTheme } from "./utils/themeManager.js";
import { runSeed } from "./lib/db/seeds.js";

/**
 * COMPONENTE RAIZ (App)
 * Responsável APENAS por:
 * - Gerenciar estado de navegação entre telas
 * - Manter dados do jogador (name, phone) e jogo selecionado
 * - Renderizar a página/Page apropriada
 *
 * TODA lógica de negócio é distribuída entre as Pages:
 * - Home.jsx: Carrega configs, settings, rankings
 * - Cadastro.jsx: Busca de jogador, validação, início de jogo
 * - Jogos.jsx: Carregamento de conteúdo do jogo, scoring
 * - Ranking.jsx: Carregamento e exibição de ranking
 */
export function App() {
  // Estado da licença (null = verificando)
  const [licenseStatus, setLicenseStatus] = useState(null);

  // Estado de bloqueio global do Totem (inicia falso; bloqueia apenas se houver senha cadastrada)
  const [isLocked, setIsLocked] = useState(false);

  // Estado de navegação
  const [sectionId, setSectionId] = useState(() => {
    const saved = localStorage.getItem("app_screen");
    return saved || "menu";
  });

  // Seed do banco + validação de licença na montagem inicial
  useEffect(() => {
    const bootstrap = async () => {
      // 1. Inicializa o banco com dados de exemplo (apenas na 1a abertura)
      await runSeed();
      // 2. Aplica o tema salvo (padrão preto e branco)
      applyTheme();
      // 3. Valida a licença e verifica se o horário do aparelho foi alterado
      const status = await validateLicense();
      setLicenseStatus(status);

      if (status.valid) {
        startClockHeartbeat((updatedStatus) => {
          setLicenseStatus(updatedStatus);
        });
      }
    };
    void bootstrap();

    return () => {
      stopClockHeartbeat();
    };
  }, []);

  // Validação inicial da senha salva em sessão (só bloqueia se o operador definiu senha)
  useEffect(() => {
    const checkSavedPassword = async () => {
      const hasPass = await hasAdminPassword();
      if (!hasPass) {
        setIsLocked(false);
        return;
      }
      const savedPass = getAdminPassword();
      if (!savedPass) {
        setIsLocked(true);
        return;
      }
      try {
        const isValid = await verifyAdminPassword(savedPass);
        if (isValid) {
          setIsLocked(false);
        } else {
          clearAdminPassword();
          setIsLocked(true);
        }
      } catch {
        setIsLocked(true);
      }
    };
    void checkSavedPassword();
  }, []);

  // Dados do jogador ativo (preenchidos em Cadastro, usados em Jogos)
  const [player, setPlayer] = useState({
    name: "",
    phone: "",
  });

  // Jogo selecionado no menu (preenchido em Home, usado em Cadastro/Jogos)
  const [selectedGame, setSelectedGame] = useState(() => {
    const saved = localStorage.getItem("app_selectedGame");
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback para valor antigo armazenado como string simples
      return null;
    }
  });
  const [pendingGameRuleRefresh, setPendingGameRuleRefresh] = useState(null);

  // Persistir estado de navegação
  useEffect(() => {
    localStorage.setItem("app_screen", sectionId);
  }, [sectionId]);

  // Tratamento global de 401/403: sessão admin inválida/expirada → limpa credencial e bloqueia o app.
  useEffect(() => {
    const onUnauthorized = () => {
      clearAdminPassword();
      setIsLocked(true);
      setSectionId("menu");
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  // Persistir jogo selecionado
  useEffect(() => {
    if (selectedGame) {
      localStorage.setItem("app_selectedGame", JSON.stringify(selectedGame));
    } else {
      localStorage.removeItem("app_selectedGame");
    }
  }, [selectedGame]);

  // Limpar valores antigos inválidos do localStorage na primeira montagem
  useEffect(() => {
    try {
      const old = localStorage.getItem("app_selectedGame");
      if (old && !old.startsWith("{")) {
        // Valor antigo em formato inválido, remove
        localStorage.removeItem("app_selectedGame");
      }
    } catch {}
  }, []);

  // Sincroniza configurações e versão de regras do jogo selecionado na montagem/recarregamento
  useEffect(() => {
    if (selectedGame?.code) {
      refreshSelectedGameConfig(selectedGame.code);
    }
  }, []);

  useEffect(() => {
    const handleNavigate = (event) => {
      const target = event?.detail?.to;
      if (target === "cadastro") {
        setSectionId("cadastro");
      }
    };

    window.addEventListener("app:navigate", handleNavigate);
    return () => window.removeEventListener("app:navigate", handleNavigate);
  }, []);

  // Desabilita o menu de contexto globalmente (clique com o botão direito / toque longo)
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Controla o degradê de fundo do HTML para os jogos da Mulher (caça-palavras e quiz)
  useEffect(() => {
    const isMulherGame = selectedGame?.code === "wordsearch_mulher" || selectedGame?.code === "quiz_mulher";
    if (isMulherGame) {
      document.documentElement.classList.add("no-html-gradient");
    } else {
      document.documentElement.classList.remove("no-html-gradient");
    }
    return () => {
      document.documentElement.classList.remove("no-html-gradient");
    };
  }, [selectedGame?.code]);

  const refreshSelectedGameConfig = useCallback(async (gameCode) => {
    const code = String(gameCode ?? "")
      .trim()
      .toLowerCase();
    if (!code) return;

    try {
      const [records, versionData] = await Promise.all([
        getAdminMenuRecords(),
        getGameRulesVersion(code).catch(() => ({ version: 1 }))
      ]);
      const games = Array.isArray(records?.games) ? records.games : [];
      const game = games.find(
        (entry) => String(entry.code ?? "").toLowerCase() === code,
      );
      if (!game) return;

      const config = buildGameConfig(game, records?.gameSettings ?? []);
      const rulesVersion = versionData?.version || 1;

      setSelectedGame((current) => {
        if (!current) return current;
        if (String(current.code ?? "").toLowerCase() !== code) return current;
        return {
          ...current,
          title: game.name ?? current.title ?? game.code,
          config,
          rulesVersion,
        };
      });
    } catch (error) {
      console.warn("Falha ao atualizar regras do jogo:", error);
    }
  }, []);

  useEffect(() => {
    const handleGameRulesChanged = (event) => {
      const gameCode = String(event?.detail?.gameCode ?? "")
        .trim()
        .toLowerCase();
      const currentCode = String(selectedGame?.code ?? "")
        .trim()
        .toLowerCase();

      if (!gameCode || !currentCode || gameCode !== currentCode) return;

      if (sectionId === "cadastro") {
        setPendingGameRuleRefresh(gameCode);
      } else {
        setPendingGameRuleRefresh(gameCode);
      }
    };

    window.addEventListener("app:gameRulesChanged", handleGameRulesChanged);
    return () =>
      window.removeEventListener(
        "app:gameRulesChanged",
        handleGameRulesChanged,
      );
  }, [refreshSelectedGameConfig, sectionId, selectedGame?.code]);

  useEffect(() => {
    if (sectionId === "cadastro") return;
    if (!pendingGameRuleRefresh) return;

    const currentCode = String(selectedGame?.code ?? "")
      .trim()
      .toLowerCase();
    if (currentCode !== pendingGameRuleRefresh) return;

    void refreshSelectedGameConfig(pendingGameRuleRefresh).finally(() => {
      setPendingGameRuleRefresh(null);
    });
  }, [
    pendingGameRuleRefresh,
    refreshSelectedGameConfig,
    sectionId,
    selectedGame?.code,
  ]);

  // ========== Funções de Navegação ==========

  const goToMenu = () => {
    if (sectionId === "jogos") {
      const confirmed = window.confirm(
        "Deseja realmente voltar ao menu principal? O jogo atual será encerrado.",
      );
      if (!confirmed) return;
    }
    setSectionId("menu");
    setSelectedGame(null);
    setPendingGameRuleRefresh(null);
    setPlayer({ name: "", phone: "" });
  };

  const goToCadastro = async (gamePayload) => {
    // Define a tela e reseta o jogador ativo imediatamente
    setPlayer({ name: "", phone: "" });
    setSectionId("cadastro");
    setSelectedGame({
      ...gamePayload,
      rulesVersion: 1 // valor inicial temporário
    });

    // Atualiza imediatamente as configurações e regras do jogo diretamente do backend,
    // evitando que o Totem use as configurações cacheadas e desatualizadas do menu (Home).
    try {
      await refreshSelectedGameConfig(gamePayload.code);
    } catch (err) {
      console.warn("Erro ao carregar versão e configurações das regras:", err);
    }
  };

  const handleBackToCadastro = useCallback(async () => {
    if (selectedGame?.code) {
      try {
        const versionData = await getGameRulesVersion(selectedGame.code);
        const latestVersion = versionData?.version || 1;
        const currentRulesVersion = selectedGame.rulesVersion || 1;
        
        if (latestVersion > currentRulesVersion) {
          localStorage.setItem("game_rules_outdated_" + selectedGame.code, "true");
        }
      } catch (err) {
        console.warn("Erro ao checar regras ao voltar ao cadastro:", err);
      }
    }
    setSectionId("cadastro");
  }, [selectedGame]);

  const goToJogos = (playerPayload) => {
    // Cadastro passa { name, phone }
    setPlayer(playerPayload);
    setSectionId("jogos");
  };

  const goToRanking = () => {
    setSectionId("ranking");
  };

  const goToAdmin = () => {
    setSectionId("admin");
  };

  // ========== Render ==========

  const handleHeaderSelect = (tabId) => {
    if (tabId === "inicio") {
      goToMenu();
    } else if (tabId === "ranking") {
      goToRanking();
    }
  };

  // Verificação de licença — mostra spinner enquanto valida
  if (licenseStatus === null) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, #0a0f1e 0%, #000510 100%)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 999999,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Verificando licença...</p>
        </div>
      </div>
    );
  }

  // Licença inválida ou expirada — bloqueia completamente
  if (!licenseStatus.valid) {
    return <LicenseScreen status={licenseStatus} />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="app-shell">
      {sectionId === "menu" ||
      sectionId === "ranking" ||
      sectionId === "admin" ? (
        <Header
          activeTab={sectionId === "ranking" ? "ranking" : "inicio"}
          onSelect={handleHeaderSelect}
        />
      ) : null}

      {sectionId === "menu" && (
        <Home
          onSelectGame={goToCadastro}
          onOpenAdmin={goToAdmin}
          onOpenDashboard={() => setSectionId("dashboard")}
        />
      )}

      {sectionId === "cadastro" && (
        <section className="game-area">
          <Cadastro
            selectedGame={selectedGame}
            onStartChallenge={goToJogos}
            onBackToMenu={goToMenu}
            refreshSelectedGameConfig={refreshSelectedGameConfig}
            onOpenDashboard={() => setSectionId("dashboard")}
            onOpenAdmin={goToAdmin}
          />
        </section>
      )}

      {sectionId === "jogos" && (
        <Jogos
          player={player}
          selectedGame={selectedGame}
          onBackToMenu={goToMenu}
          onBackToCadastro={handleBackToCadastro}
        />
      )}

      {sectionId === "dashboard" && (
        <section className="game-area">
          <Dashboard
            onBackToMenu={goToMenu}
            onBackToCadastro={handleBackToCadastro}
            onOpenAdmin={goToAdmin}
          />
        </section>
      )}

      {sectionId === "ranking" && (
        <section className="game-area">
          <Ranking onBackToMenu={goToMenu} />
        </section>
      )}

      {sectionId === "admin" && (
        <section className="game-area">
          <AdminHub
            onBackToMenu={goToMenu}
            onBackToCadastro={handleBackToCadastro}
            onOpenDashboard={() => setSectionId("dashboard")}
          />
        </section>
      )}
    </div>
  );
}

export default App;
