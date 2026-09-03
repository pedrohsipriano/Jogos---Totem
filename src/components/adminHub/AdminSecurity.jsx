import { useState, useEffect } from 'react';
import { hasAdminPassword, registerAdminPassword, removeAdminPassword } from '../../lib/appDatabase';

export function AdminSecurity() {
  const [hasPass, setHasPass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshStatus = async () => {
    const active = await hasAdminPassword();
    setHasPass(active);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPass.trim()) {
      setError('Por favor, informe a nova senha.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('A confirmação de senha não confere.');
      return;
    }

    await registerAdminPassword(newPass.trim());
    setNewPass('');
    setConfirmPass('');
    setMessage('Senha configurada com sucesso! O Totem agora está protegido.');
    await refreshStatus();
  };

  const handleRemove = async () => {
    if (window.confirm('Tem certeza que deseja remover a senha? O Totem ficará com acesso livre sem bloqueio.')) {
      await removeAdminPassword();
      setNewPass('');
      setConfirmPass('');
      setMessage('Senha removida com sucesso. O Totem agora possui acesso livre.');
      setError('');
      await refreshStatus();
    }
  };

  return (
    <section className="admin-section panel" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
      <div className="panel-head" style={{ marginTop: 0, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, color: '#ffffff', marginBottom: 4 }}>Segurança e Acesso</h2>
          <p className="muted" style={{ fontSize: 14 }}>Controle de senha para restrição de acesso ao totem e configurações.</p>
        </div>
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1.5px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: hasPass ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            {hasPass ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
              {hasPass ? 'Totem Protegido por Senha' : 'Acesso Livre (Sem Senha)'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.75)' }}>
              {hasPass
                ? 'A senha é exigida para acessar configurações e navegação restrita.'
                : 'O aplicativo inicia diretamente e permite acesso livre ao painel.'}
            </div>
          </div>
        </div>

        {hasPass && (
          <button
            type="button"
            onClick={handleRemove}
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Remover Senha
          </button>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, color: '#ffffff', margin: 0 }}>
          {hasPass ? 'Alterar Senha do Totem' : 'Definir uma Nova Senha'}
        </h3>

        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            Nova Senha
          </label>
          <input
            type="password"
            className="input"
            style={{
              width: '100%',
              minHeight: 48,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 10,
              color: '#ffffff',
              padding: '10px 14px',
              boxSizing: 'border-box'
            }}
            placeholder="Digite a nova senha..."
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            Confirmar Senha
          </label>
          <input
            type="password"
            className="input"
            style={{
              width: '100%',
              minHeight: 48,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 10,
              color: '#ffffff',
              padding: '10px 14px',
              boxSizing: 'border-box'
            }}
            placeholder="Confirme a nova senha..."
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid #ffffff',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 14
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <button
            type="submit"
            className="primary"
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: '#ffffff',
              color: '#000000'
            }}
          >
            {hasPass ? 'Salvar Nova Senha' : 'Criar Senha'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AdminSecurity;
