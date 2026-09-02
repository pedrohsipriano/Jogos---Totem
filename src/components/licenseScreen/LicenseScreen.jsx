import './licenseScreen.style.css';

/**
 * LicenseScreen — Tela de bloqueio por licença inválida ou expirada.
 *
 * Props:
 *  - status: { valid, expired, missing, daysLeft, id, expireAt }
 */
export function LicenseScreen({ status }) {
  const isExpired = status?.expired;
  const isMissing = status?.missing;

  const expireDate = status?.expireAt
    ? new Date(status.expireAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="license-overlay">
      <div className="license-card">
        {/* Ícone */}
        <div className="license-icon-wrap">
          {isExpired ? (
            <svg className="license-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          ) : (
            <svg className="license-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          )}
        </div>

        {/* Título */}
        <div className="license-header">
          <h1 className="license-title">
            {isExpired ? 'Licença Expirada' : 'Licença Inválida'}
          </h1>
          <p className="license-subtitle">
            {isExpired
              ? `Esta licença expirou em ${expireDate ?? 'data desconhecida'}.`
              : isMissing
                ? 'Nenhuma licença encontrada neste dispositivo.'
                : 'O arquivo de licença está corrompido ou é inválido.'}
          </p>
        </div>

        {/* Detalhes */}
        <div className="license-details">
          {isExpired && status?.id && (
            <div className="license-detail-row">
              <span>Totem ID</span>
              <strong>{status.id}</strong>
            </div>
          )}
          {isExpired && expireDate && (
            <div className="license-detail-row">
              <span>Expirou em</span>
              <strong>{expireDate}</strong>
            </div>
          )}
        </div>

        {/* Instrução */}
        <div className="license-instruction">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>
            {isExpired
              ? 'Solicite uma nova chave de licença ao administrador do sistema.'
              : 'Execute o script de geração de licença e inclua o arquivo no dispositivo.'}
          </p>
        </div>

        {/* Código de instrução */}
        <div className="license-code-block">
          <code>node scripts/generate-license.js --id TV-XX --days 30</code>
        </div>
      </div>
    </div>
  );
}

export default LicenseScreen;
