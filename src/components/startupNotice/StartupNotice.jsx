import { useState, useEffect } from "react";
import "./startupNotice.styles.css";

/**
 * StartupNotice — Tela de aviso e orientações exibida obrigatoriamente
 * sempre que o aplicativo é iniciado, antes mesmo da tela de senha.
 *
 * @param {Object} props
 * @param {Object} props.licenseStatus - Objeto retornado por validateLicense()
 * @param {Function} props.onConfirm - Callback disparado quando o usuário clica para prosseguir
 */
export default function StartupNotice({ licenseStatus = {}, onConfirm }) {
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [canProceed, setCanProceed] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Calcula o tempo restante detalhado e formata datas
  useEffect(() => {
    const updateCountdown = () => {
      if (!licenseStatus?.expireAt) {
        setTimeLeftStr("Informação de expiração indisponível");
        return;
      }

      const expireMs = new Date(licenseStatus.expireAt).getTime();
      const nowMs = Date.now();
      const diffMs = expireMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeftStr("Licença expirada");
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days} dia${days > 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hora${hours > 1 ? "s" : ""}`);
      if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? "s" : ""}`);
      if (parts.length === 0) parts.push(`${seconds} segundo${seconds > 1 ? "s" : ""}`);

      setTimeLeftStr(parts.join(", "));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [licenseStatus]);

  // Contagem regressiva de leitura de 3 segundos para induzir o usuário a ler
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanProceed(true);
    }
  }, [countdown]);

  const formatDate = (isoString) => {
    if (!isoString) return "Não registrado";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Não registrado";
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "Não registrado";
    }
  };

  return (
    <div className="startup-notice-overlay">
      <div className="startup-notice-container">
        {/* Cabeçalho do Aviso */}
        <header className="startup-notice-header">
          <div className="startup-notice-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Aviso Importante do Sistema</span>
          </div>
          <h1 className="startup-notice-title">Instruções de Uso &amp; Licença</h1>
          <p className="startup-notice-subtitle">
            Leia atentamente as informações operacionais antes de acessar o Totem.
          </p>
        </header>

        {/* Grade de Cards Informativos */}
        <div className="startup-notice-grid">
          {/* CARD 1: LICENÇA E PRAZO */}
          <div className="startup-card startup-card-license">
            <div className="startup-card-header">
              <div className="startup-card-icon icon-license">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="startup-card-titles">
                <h2 className="startup-card-title">Vigência da Licença</h2>
                <span className="startup-card-tag tag-license">Monitoramento Ativo</span>
              </div>
            </div>

            <div className="startup-license-timer">
              <span className="startup-timer-label">Tempo Restante de Licença:</span>
              <strong className="startup-timer-value">{timeLeftStr || "Calculando..."}</strong>
            </div>

            <div className="startup-license-details">
              <div className="startup-detail-row">
                <span className="detail-label">Data e Hora de Ativação:</span>
                <span className="detail-value">{formatDate(licenseStatus.activatedAt)}</span>
              </div>
              <div className="startup-detail-row">
                <span className="detail-label">Data e Hora de Desativação:</span>
                <span className="detail-value">{formatDate(licenseStatus.expireAt)}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: PERSONALIZAÇÃO */}
          <div className="startup-card startup-card-settings">
            <div className="startup-card-header">
              <div className="startup-card-icon icon-settings">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className="startup-card-titles">
                <h2 className="startup-card-title">Estilização &amp; Cores</h2>
                <span className="startup-card-tag tag-settings">Configurações Visuais</span>
              </div>
            </div>
            <div className="startup-card-body">
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Como acessar as configurações:</strong> No <em>canto superior direito</em> da tela, primeiro toque na <strong>bolinha</strong> de navegação para expandir o menu e, em seguida, toque no botão com o <strong>símbolo de engrenagem</strong>.
                </p>
              </div>
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Modo Padrão:</strong> O sistema é entregue no tema padrão preto e branco com alta legibilidade.
                </p>
              </div>
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Totalmente customizável:</strong> Você pode alterar cores principais, fundos, imagem de background, opacidade e logotipo da sua marca.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: PERGUNTAS E CONTEÚDOS */}
          <div className="startup-card startup-card-content">
            <div className="startup-card-header">
              <div className="startup-card-icon icon-content">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="startup-card-titles">
                <h2 className="startup-card-title">Perguntas &amp; Palavras</h2>
                <span className="startup-card-tag tag-content">Área do Administrador</span>
              </div>
            </div>
            <div className="startup-card-body">
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Conteúdo Neutro:</strong> As perguntas do Quiz e palavras dos jogos vêm pré-carregadas em modo padrão neutro.
                </p>
              </div>
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Edição Ilimitada:</strong> Na área de <em>Administrador</em>, você pode incluir, editar ou excluir perguntas e palavras temáticas para o seu evento.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 4: SEGURANÇA E SENHA */}
          <div className="startup-card startup-card-security">
            <div className="startup-card-header">
              <div className="startup-card-icon icon-security">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="startup-card-titles">
                <h2 className="startup-card-title">Segurança por Senha</h2>
                <span className="startup-card-tag tag-security">Controle de Acesso</span>
              </div>
            </div>
            <div className="startup-card-body">
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <p className="startup-topic-text">
                  <strong>Senha Única de Proteção:</strong> Você pode cadastrar uma senha de segurança que protege todo o Totem.
                </p>
              </div>
              <div className="startup-topic-item">
                <span className="startup-topic-dot"></span>
                <div className="startup-topic-text">
                  <strong>Onde a senha é solicitada:</strong>
                  <div className="startup-password-steps">
                    <span className="step-badge">1. Ao entrar no aplicativo (bloqueio inicial)</span>
                    <span className="step-badge">2. Ao acessar a área de Administrador</span>
                    <span className="step-badge">3. Ao sair de um jogo em andamento (evita abandono de partida)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Botão de Confirmação */}
        <footer className="startup-notice-footer">
          <button
            type="button"
            className={`startup-confirm-btn ${!canProceed ? "waiting" : ""}`}
            onClick={onConfirm}
            disabled={!canProceed}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              {canProceed ? "Li e Compreendi as Orientações — Acessar Totem" : `Aguarde a leitura (${countdown}s)...`}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
