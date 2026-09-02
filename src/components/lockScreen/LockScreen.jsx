import { useState } from "react";
import { verifyAdminPassword, setAdminPassword } from "../../lib/appDatabase";

export function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Por favor, digite a senha.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isValid = await verifyAdminPassword(password);
      if (isValid) {
        setAdminPassword(password);
        onUnlock();
      } else {
        setError("Senha administrativa incorreta ou inválida.");
      }
    } catch (err) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className="lock-screen-card">
        <div className="lock-screen-header">
          <div className="lock-icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="lock-icon">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2>OmniVarejo - Jogos</h2>
          <p>Acesso Restrito ao Operador do Totem</p>
        </div>

        <form onSubmit={handleSubmit} className="lock-screen-form">
          <div className="form-group">
            <label htmlFor="totem-password">Senha de Ativação</label>
            <input
              id="totem-password"
              type="password"
              placeholder="Digite a senha administrativa..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="lock-screen-error">{error}</div>}

          <button type="submit" className="btn-unlock" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              "Desbloquear Totem"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LockScreen;
