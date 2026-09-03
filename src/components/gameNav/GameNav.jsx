import { useState, useRef, useEffect } from "react";
import { verifyAdminPassword, setAdminPassword, hasAdminPassword } from "../../lib/appDatabase";
import "./gameNav.style.css";

export function GameNav({
  currentScreen,
  onBackToMenu,
  onBackToCadastro,
  onOpenAdmin,
  onOpenDashboard,
}) {
  const [open, setOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState(null);
  const [promptPassword, setPromptPassword] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (promptConfig && inputRef.current) {
      inputRef.current.focus();
    }
  }, [promptConfig]);

  const blurActiveElement = () => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  };

  const promptAndAuthorize = async (mensagem, onSuccess) => {
    const hasPass = await hasAdminPassword();
    if (!hasPass) {
      blurActiveElement();
      setOpen(false);
      onSuccess?.();
      return;
    }
    blurActiveElement();
    setPromptPassword("");
    setPromptConfig({ mensagem, onSuccess });
  };

  const handlePromptSubmit = async (e) => {
    e?.preventDefault();
    if (!promptPassword) return;
    
    const senha = promptPassword;
    const config = promptConfig;
    setPromptConfig(null);
    setPromptPassword("");

    const ok = await verifyAdminPassword(senha);
    blurActiveElement();
    if (ok) {
      setAdminPassword(senha);
      setOpen(false);
      config?.onSuccess?.();
    } else {
      alert("Senha incorreta!");
      blurActiveElement();
    }
  };

  const handlePromptCancel = () => {
    setPromptConfig(null);
    setPromptPassword("");
    blurActiveElement();
  };

  const handleOpenAdmin = (e) => {
    if (e?.currentTarget) e.currentTarget.blur();
    promptAndAuthorize("Digite a senha para acessar a administração:", onOpenAdmin);
  };

  const handleOpenDashboard = (e) => {
    if (e?.currentTarget) e.currentTarget.blur();
    promptAndAuthorize("Digite a senha para acessar a dashboard:", onOpenDashboard);
  };

  const handleBackToMenu = (e) => {
    if (e?.currentTarget) e.currentTarget.blur();
    promptAndAuthorize("Digite a senha para voltar ao menu:", onBackToMenu);
  };

  // Condicionais de exibição baseadas nas regras do usuário
  const showMenuBtn = currentScreen !== "menu" && onBackToMenu;
  const showCadastroBtn = currentScreen === "jogos" && onBackToCadastro;
  const showDashboardBtn = currentScreen !== "dashboard" && onOpenDashboard;
  const showAdminBtn = currentScreen !== "admin" && onOpenAdmin;

  // Se nenhum botão deve ser exibido, não mostra o menu
  if (!showMenuBtn && !showCadastroBtn && !showDashboardBtn && !showAdminBtn) {
    return null;
  }

  return (
    <div className={`game-nav ${open ? "open" : ""}`}>
      <button
        className="game-nav-toggle"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? "Fechar navegação" : "Abrir navegação"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill="#F60085" />
        </svg>
      </button>

      <div className="game-nav-panel" role="menu">
        {/* Botão Início (Voltar ao menu) */}
        {showMenuBtn && (
          <button
            className="nav-btn"
            title="Voltar ao início"
            onClick={handleBackToMenu}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5z"
                fill="#fff"
              />
            </svg>
          </button>
        )}

        {/* Botão Cadastro */}
        {showCadastroBtn && (
          <button
            className="nav-btn"
            title="Voltar ao cadastro"
            onClick={() => {
              setOpen(false);
              onBackToCadastro?.();
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 11H7.83l4.58-4.59L11 5l-7 7 7 7 1.41-1.41L7.83 13H20v-2z"
                fill="#fff"
              />
            </svg>
          </button>
        )}

        {/* Botão Dashboard */}
        {showDashboardBtn && (
          <button
            className="nav-btn"
            title="Dashboard de Estatísticas"
            onClick={handleOpenDashboard}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                fill="#fff"
              />
            </svg>
          </button>
        )}

        {/* Botão Admin */}
        {showAdminBtn && (
          <button
            className="nav-btn"
            title="Administração"
            onClick={handleOpenAdmin}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                fill="#fff"
              />
            </svg>
          </button>
        )}
      </div>

      {promptConfig && (
        <div className="password-prompt-overlay" style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999999
        }}>
          <form className="password-prompt-modal" onSubmit={handlePromptSubmit} style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "15px",
            display: "flex", flexDirection: "column", gap: "20px",
            minWidth: "350px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
          }}>
            <p style={{ margin: 0, fontWeight: "bold", textAlign: "center", color: "#333", fontSize: "1.2rem", fontFamily: "sans-serif" }}>
              {promptConfig.mensagem}
            </p>
            <input 
              ref={inputRef}
              type="password" 
              placeholder="Senha"
              value={promptPassword}
              onChange={(e) => setPromptPassword(e.target.value)}
              style={{ 
                padding: "15px", fontSize: "1.2rem", borderRadius: "8px", 
                border: "2px solid #ddd", color: "#333", outline: "none",
                fontFamily: "monospace"
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handlePromptCancel();
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button 
                type="button"
                onClick={handlePromptCancel}
                style={{ 
                  padding: "12px 24px", background: "#f0f0f0", color: "#555", 
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "1rem", fontWeight: "bold"
                }}
              >Cancelar</button>
              <button 
                type="submit"
                style={{ 
                  padding: "12px 24px", background: "#F60085", color: "#fff", 
                  border: "none", borderRadius: "8px", cursor: "pointer",
                  fontSize: "1rem", fontWeight: "bold"
                }}
              >Confirmar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default GameNav;
