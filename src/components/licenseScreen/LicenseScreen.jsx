import './licenseScreen.style.css';
import { SystemHeader, SystemFooter } from '../common/SystemBanner.jsx';

/**
 * LicenseScreen — Tela de bloqueio por licença inválida, expirada ou erro de relógio.
 *
 * Props:
 *  - status: { valid, expired, missing, invalid, clockInvalid, clockTampered, daysLeft, id, expireAt, activatedAt, timeSource }
 */
export function LicenseScreen({ status }) {
  const isExpired = status?.expired;
  const isMissing = status?.missing;
  const isClockInvalid = status?.clockInvalid;
  const isClockTampered = status?.clockTampered;

  const expireDate = status?.expireAt
    ? new Date(status.expireAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : null;

  const activatedDate = status?.activatedAt
    ? new Date(status.activatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const getHeaderInfo = () => {
    if (isClockInvalid) {
      return {
        title: 'Relógio do Totem Desajustado',
        subtitle: 'A data e hora deste dispositivo estão incorretas ou no padrão de fábrica (anterior a 2025). Ajuste o relógio do Android para continuar.',
      };
    }
    if (isClockTampered) {
      return {
        title: 'Inconsistência de Horário Detectada',
        subtitle: 'O relógio do dispositivo foi retrocedido em relação ao último registro do sistema. Restaure a data e hora corretas.',
      };
    }
    if (isExpired) {
      return {
        title: 'Licença Expirada',
        subtitle: `Esta licença expirou em ${expireDate ?? 'data desconhecida'}.`,
      };
    }
    if (isMissing) {
      return {
        title: 'Licença Não Encontrada',
        subtitle: 'Nenhuma licença foi localizada neste dispositivo.',
      };
    }
    return {
      title: 'Licença Inválida',
      subtitle: 'O arquivo de licença está corrompido ou é inválido para este dispositivo.',
    };
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="license-overlay">
      <SystemHeader />
      <div className="license-card">
        {/* Ícone contextual via SVG inline */}
        <div className="license-icon-wrap">
          {isClockInvalid || isClockTampered ? (
            <svg className="license-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : isExpired ? (
            <svg className="license-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg className="license-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </div>

        {/* Cabeçalho */}
        <div className="license-header">
          <h1 className="license-title">{title}</h1>
          <p className="license-subtitle">{subtitle}</p>
        </div>

        {/* Detalhes */}
        <div className="license-details">
          {status?.id && (
            <div className="license-detail-row">
              <span>Totem ID</span>
              <strong>{status.id}</strong>
            </div>
          )}
          {isClockTampered && status?.lastRecordedDate && (
            <div className="license-detail-row">
              <span>Último Registro</span>
              <strong style={{ color: '#38bdf8' }}>
                {new Date(status.lastRecordedDate).toLocaleString('pt-BR')}
              </strong>
            </div>
          )}
          {isClockTampered && status?.currentDate && (
            <div className="license-detail-row">
              <span>Horário Atual Detectado</span>
              <strong style={{ color: '#f87171' }}>
                {new Date(status.currentDate).toLocaleString('pt-BR')}
              </strong>
            </div>
          )}
          {activatedDate && (
            <div className="license-detail-row">
              <span>Ativado em</span>
              <strong>{activatedDate}</strong>
            </div>
          )}
          {expireDate && (
            <div className="license-detail-row">
              <span>{isExpired ? 'Expirou em' : 'Válido até'}</span>
              <strong>{expireDate}</strong>
            </div>
          )}
          {status?.timeSource && (
            <div className="license-detail-row">
              <span>Fonte de Horário</span>
              <strong>{status.timeSource === 'network' ? 'Rede Confiável' : 'Relógio Local'}</strong>
            </div>
          )}
        </div>

        {/* Instruções contextuais */}
        <div className="license-instruction">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>
            {isClockInvalid || isClockTampered
              ? 'Acesse as Configurações do Android, marque "Data e hora automáticas" ou ajuste o horário atual e recarregue.'
              : isExpired
                ? 'Esta licença expirou. Para renovar o acesso ou obter suporte, contate o responsável pelo e-mail abaixo.'
                : 'Para ativação de licença ou suporte técnico, entre em contato pelo e-mail abaixo.'}
          </p>
        </div>

        {/* Informações de Suporte Técnico e Renovação */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: '#e2e8f0',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>
              Desenvolvido por <strong>ps.system</strong>
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            Renovação e Suporte:{' '}
            <a
              href="mailto:contato.pssystem@gmail.com"
              style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 600 }}
            >
              contato.pssystem@gmail.com
            </a>
          </span>
        </div>

        {/* Ação de Recarga / Tentar Novamente */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Verificar Novamente
        </button>
      </div>
      <SystemFooter />
    </div>
  );
}

export default LicenseScreen;
