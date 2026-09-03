import { useState, useCallback } from 'react';
import {
  getTheme,
  saveTheme,
  applyTheme,
  resetTheme,
  DEFAULT_THEME,
  AVAILABLE_FONTS,
  COLOR_PALETTE,
} from '../../utils/themeManager.js';

const BG_DIRECTIONS = [
  { value: '180deg', label: 'Vertical (cima para baixo)' },
  { value: '0deg',   label: 'Vertical (baixo para cima)' },
  { value: '90deg',  label: 'Horizontal (esquerda para direita)' },
  { value: '135deg', label: 'Diagonal' },
];

/** Pill de cor com preview */
function ColorSwatch({ color, selected, onClick }) {
  return (
    <button
      type="button"
      className={`theme-swatch${selected ? ' theme-swatch--active' : ''}`}
      style={{ background: color }}
      onClick={() => onClick(color)}
      title={color}
    />
  );
}

/** Paleta de cores + input hex livre */
function ColorPicker({ label, value, onChange }) {
  return (
    <div className="theme-color-picker">
      <span className="theme-field-label">{label}</span>
      <div className="theme-palette">
        {COLOR_PALETTE.map((c) => (
          <ColorSwatch key={c} color={c} selected={value === c} onClick={onChange} />
        ))}
      </div>
      <div className="theme-hex-row">
        <div className="theme-hex-preview" style={{ background: value }} />
        <input
          type="color"
          className="theme-color-input"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          title="Escolher cor personalizada"
        />
        <input
          type="text"
          className="theme-hex-text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function Personalizacao() {
  const [theme,        setThemeState]   = useState(() => getTheme());
  const [activeSubTab, setActiveSubTab] = useState('logo');
  const [saved,        setSaved]        = useState(false);
  const [imgError,     setImgError]     = useState('');
  const [logoError,    setLogoError]    = useState('');

  const update = useCallback((key, value) => {
    setThemeState((prev) => {
      const next = { ...prev, [key]: value };
      applyTheme(next); // preview em tempo real
      return next;
    });
    setSaved(false);
  }, []);

  const handleSave = () => {
    saveTheme(theme);
    applyTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    const def = resetTheme();
    setThemeState(def);
    setSaved(false);
  };

  const handleLogoUpload = (e) => {
    setLogoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite estrito de 2 MB para o logotipo
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Arquivo muito grande. O logotipo deve ter no máximo 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      update('customLogo', ev.target.result);
    };
    reader.onerror = () => setLogoError('Erro ao carregar o arquivo de logotipo.');
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    setImgError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite estrito de 5 MB para o plano de fundo
    if (file.size > 5 * 1024 * 1024) {
      setImgError('Arquivo muito grande. A imagem de fundo deve ter no máximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      update('bgImage', ev.target.result);
      update('bgMode',  'image');
    };
    reader.onerror = () => setImgError('Erro ao carregar a imagem de fundo.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="personalizacao-container">
      <div className="personalizacao-header">
        <div>
          <p className="eyebrow">Aparência</p>
          <h2>Personalização Visual</h2>
        </div>
        <div className="personalizacao-actions">
          <button type="button" className="ghost" onClick={handleReset}>
            Restaurar padrão
          </button>
          <button
            type="button"
            className={`primary btn-save${saved ? ' btn-save--ok' : ''}`}
            onClick={handleSave}
          >
            {saved ? 'Salvo!' : 'Aplicar e Salvar'}
          </button>
        </div>
      </div>

      {/* ── Sub-navegação em Abas ──────────────────────────────── */}
      <div className="personalizacao-nav-tabs">
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'logo' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('logo')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Logotipo
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'cards' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('cards')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
          Cards e Telas
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'teclado' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('teclado')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>
          Teclado Virtual
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'vitoria' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('vitoria')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8v2h8v-2h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          Fim de Jogo
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'fundo' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('fundo')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Plano de Fundo
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'cores' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('cores')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Cores Principais
        </button>
        <button
          type="button"
          className={`personalizacao-nav-tab${activeSubTab === 'tipografia' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('tipografia')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Tipografia
        </button>
      </div>

      {/* ── ABA: PERSONALIZAÇÃO DOS CARDS, BOTÕES E RANKING ────── */}
      {activeSubTab === 'cards' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
            Personalização dos Cards, Botões e Ranking
          </h3>

          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Configure as cores dos cards de desafio, do botão principal de início e do card de ranking.
          </p>

          {/* Seção 1: Cards do Menu Inicial */}
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 20 }}>
            <h4 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 14px 0' }}>1. Cards de Jogos (Menu)</h4>
            <div className="theme-colors-grid">
              <ColorPicker
                label="Fundo do Card"
                value={theme.cardBg || '#111111'}
                onChange={(c) => update('cardBg', c)}
              />
              <ColorPicker
                label="Borda do Card"
                value={theme.cardBorder || '#ffffff'}
                onChange={(c) => update('cardBorder', c)}
              />
              <ColorPicker
                label="Título / Textos do Card"
                value={theme.cardText || '#ffffff'}
                onChange={(c) => update('cardText', c)}
              />
              <ColorPicker
                label="Fundo do Botão (Começar)"
                value={theme.cardBtnBg || '#ffffff'}
                onChange={(c) => update('cardBtnBg', c)}
              />
              <ColorPicker
                label="Texto do Botão (Começar)"
                value={theme.cardBtnText || '#000000'}
                onChange={(c) => update('cardBtnText', c)}
              />
            </div>

            {/* Preview do Card */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 14,
            }}>
              <div style={{
                width: '100%',
                maxWidth: 400,
                minHeight: '10.5rem',
                padding: '1.25rem 1.5rem',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '1.5rem',
                border: `2px solid ${theme.cardBorder || '#ffffff'}`,
                background: theme.cardBg || '#111111',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                gap: '1.25rem',
              }}>
                <h4 style={{
                  color: theme.cardText || '#ffffff',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  margin: 0,
                  fontFamily: theme.fontFamily,
                }}>
                  Jogo da Memória
                </h4>
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '0.8125rem',
                  background: theme.cardBtnBg || '#ffffff',
                  border: `1px solid ${theme.cardBtnBg || '#ffffff'}`,
                  color: theme.cardBtnText || '#000000',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  fontFamily: theme.fontFamily,
                  cursor: 'default',
                  boxShadow: '0 0 16px rgba(255, 255, 255, 0.15)',
                }}>
                  Começar a jogar
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Botão "Começar o desafio" */}
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 20 }}>
            <h4 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 14px 0' }}>2. Botão Principal "Começar o desafio" (Tela de Início)</h4>
            <div className="theme-colors-grid">
              <ColorPicker
                label="Fundo do Botão Desafio"
                value={theme.challengeBtnBg || '#ffffff'}
                onChange={(c) => update('challengeBtnBg', c)}
              />
              <ColorPicker
                label="Texto do Botão Desafio"
                value={theme.challengeBtnText || '#000000'}
                onChange={(c) => update('challengeBtnText', c)}
              />
            </div>

            {/* Preview do Botão Começar o Desafio */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 14,
            }}>
              <div style={{
                width: '100%',
                maxWidth: 480,
                padding: '1.25rem 2rem',
                borderRadius: '1.5rem',
                background: theme.challengeBtnBg || '#ffffff',
                border: `2px solid ${theme.challengeBtnBg || '#ffffff'}`,
                color: theme.challengeBtnText || '#000000',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '2rem',
                fontFamily: theme.fontFamily,
                cursor: 'default',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              }}>
                Começar o desafio
              </div>
            </div>
          </div>

          {/* Seção 3: Background e Borda do Ranking */}
          <div>
            <h4 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 14px 0' }}>3. Card do Ranking Total</h4>
            <div className="theme-colors-grid">
              <ColorPicker
                label="Fundo do Card Ranking"
                value={theme.rankingBg || '#111111'}
                onChange={(c) => update('rankingBg', c)}
              />
              <ColorPicker
                label="Borda do Card Ranking"
                value={theme.rankingBorder || '#ffffff'}
                onChange={(c) => update('rankingBorder', c)}
              />
            </div>

            {/* Preview do Card de Ranking */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 14,
            }}>
              <div style={{
                width: '100%',
                maxWidth: 480,
                padding: '1.5rem 1.75rem',
                borderRadius: '2rem',
                background: theme.rankingBg || '#111111',
                border: `2px solid ${theme.rankingBorder || '#ffffff'}`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1.75rem', margin: '0 0 4px 0', fontFamily: theme.fontFamily }}>Rank Total</h4>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Demonstração visual do card</p>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${theme.rankingBorder || 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '1.25rem',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  <span>1º JOGADOR</span>
                  <span>(61) 99999-0000</span>
                  <span style={{ color: '#38bdf8' }}>100 pts</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA: PERSONALIZAÇÃO DO TECLADO VIRTUAL ────────────── */}
      {activeSubTab === 'teclado' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>
            Personalização das Cores do Teclado Virtual
          </h3>

          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Configure as cores de fundo, borda, teclas numéricas, destaque de foco e botões de ação do teclado virtual.
          </p>

          <div className="theme-colors-grid">
            <ColorPicker
              label="Fundo do Teclado"
              value={theme.keyboardBg || 'rgba(2, 18, 41, 0.75)'}
              onChange={(c) => update('keyboardBg', c)}
            />
            <ColorPicker
              label="Borda do Teclado"
              value={theme.keyboardBorder || 'rgba(255, 255, 255, 0.2)'}
              onChange={(c) => update('keyboardBorder', c)}
            />
            <ColorPicker
              label="Números / Teclas"
              value={theme.keyboardText || '#ffffff'}
              onChange={(c) => update('keyboardText', c)}
            />
            <ColorPicker
              label="Destaque de Foco (Campo)"
              value={theme.keyboardFocus || '#07BCEE'}
              onChange={(c) => update('keyboardFocus', c)}
            />
            <ColorPicker
              label="Ações (Limpar / Apagar)"
              value={theme.keyboardActionColor || '#ef4444'}
              onChange={(c) => update('keyboardActionColor', c)}
            />
          </div>

          {/* Pré-visualização do Teclado em Tempo Real */}
          <div style={{ marginTop: 20 }}>
            <span className="theme-field-label">Pré-visualização do Teclado Virtual</span>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
            }}>
              <div style={{
                width: '100%',
                maxWidth: 520,
                background: theme.keyboardBg || 'rgba(2, 18, 41, 0.75)',
                border: `1px solid ${theme.keyboardBorder || 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: 20,
                padding: '16px 20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {/* Header do Teclado */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  color: '#cbd5e1',
                  fontSize: 15,
                  paddingBottom: 10,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 500,
                }}>
                  <span>Digitando em:</span>
                  <strong style={{ color: theme.keyboardFocus || '#07BCEE', textShadow: `0 0 8px ${theme.keyboardFocus || '#07BCEE'}` }}>
                    Telefone
                  </strong>
                </div>

                {/* Grade Numérica 3x4 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 440, width: '100%', margin: '8px auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    {['1', '2', '3'].map((n) => (
                      <div key={n} style={{
                        flex: 1,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                        fontWeight: 600,
                        color: theme.keyboardText || '#ffffff',
                      }}>
                        {n}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    {['4', '5', '6'].map((n) => (
                      <div key={n} style={{
                        flex: 1,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                        fontWeight: 600,
                        color: theme.keyboardText || '#ffffff',
                      }}>
                        {n}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    {['7', '8', '9'].map((n) => (
                      <div key={n} style={{
                        flex: 1,
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                        fontWeight: 600,
                        color: theme.keyboardText || '#ffffff',
                      }}>
                        {n}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      flex: 1,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                      color: theme.keyboardActionColor || '#ef4444',
                    }}>
                      Limpar
                    </div>
                    <div style={{
                      flex: 1,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 40,
                      fontWeight: 600,
                      color: theme.keyboardText || '#ffffff',
                    }}>
                      0
                    </div>
                    <div style={{
                      flex: 1,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 700,
                      color: theme.keyboardActionColor || '#ef4444',
                    }}>
                      ←
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA: PERSONALIZAÇÃO DA TELA DE VITÓRIA / FIM DE JOGO ── */}
      {activeSubTab === 'vitoria' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8v2h8v-2h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            Personalização da Tela de Vitória / Fim de Jogo
          </h3>

          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Configure as cores da janela de resultado exibida ao jogador ao término de cada desafio.
          </p>

          <div className="theme-colors-grid">
            <ColorPicker
              label="Fundo da Janela"
              value={theme.victoryBg || 'rgba(0, 0, 0, 0.85)'}
              onChange={(c) => update('victoryBg', c)}
            />
            <ColorPicker
              label="Borda da Janela / Caixas"
              value={theme.victoryBorder || '#ffffff'}
              onChange={(c) => update('victoryBorder', c)}
            />
            <ColorPicker
              label="Título (Voce venceu!)"
              value={theme.victoryTitle || '#ffffff'}
              onChange={(c) => update('victoryTitle', c)}
            />
            <ColorPicker
              label="Fundo das Caixas (Pontos/Tempo)"
              value={theme.victoryBadgeBg || 'rgba(255, 255, 255, 0.15)'}
              onChange={(c) => update('victoryBadgeBg', c)}
            />
            <ColorPicker
              label="Texto das Caixas (Pontos/Tempo)"
              value={theme.victoryBadgeText || '#ffffff'}
              onChange={(c) => update('victoryBadgeText', c)}
            />
            <ColorPicker
              label="Fundo do Botão Voltar"
              value={theme.victoryBtnBg || '#ffffff'}
              onChange={(c) => update('victoryBtnBg', c)}
            />
            <ColorPicker
              label="Texto do Botão Voltar"
              value={theme.victoryBtnText || '#000000'}
              onChange={(c) => update('victoryBtnText', c)}
            />
          </div>

          {/* Pré-visualização da Tela de Vitória em Tempo Real */}
          <div style={{ marginTop: 24 }}>
            <span className="theme-field-label">Pré-visualização da Janela de Resultado</span>
            <div style={{
              background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              padding: 32,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
            }}>
              <div style={{
                width: '100%',
                maxWidth: 480,
                background: theme.victoryBg || 'rgba(0, 0, 0, 0.85)',
                border: `2px solid ${theme.victoryBorder || '#ffffff'}`,
                borderRadius: 14,
                padding: '24px 20px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}>
                {/* Título */}
                <h3 style={{
                  color: theme.victoryTitle || '#ffffff',
                  fontSize: 32,
                  fontWeight: 800,
                  margin: '4px 0 8px 0',
                  textAlign: 'center',
                  letterSpacing: -0.5,
                }}>
                  Voce venceu!
                </h3>

                {/* Caixa Pontuação */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${theme.victoryBorder || 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 700 }}>
                    Sua pontuação:
                  </span>
                  <div style={{
                    background: theme.victoryBadgeBg || 'rgba(255, 255, 255, 0.15)',
                    color: theme.victoryBadgeText || '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    minWidth: 120,
                    textAlign: 'center',
                  }}>
                    106 pontos
                  </div>
                </div>

                {/* Caixa Tempo */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${theme.victoryBorder || 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 700 }}>
                    Seu tempo:
                  </span>
                  <div style={{
                    background: theme.victoryBadgeBg || 'rgba(255, 255, 255, 0.15)',
                    color: theme.victoryBadgeText || '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    minWidth: 120,
                    textAlign: 'center',
                  }}>
                    23s
                  </div>
                </div>

                {/* Botão Voltar ao Cadastro */}
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: theme.victoryBtnBg || '#ffffff',
                    color: theme.victoryBtnText || '#000000',
                    border: 'none',
                    borderRadius: 10,
                    padding: '16px 20px',
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: 6,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Voltar ao Cadastro
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA 1: LOGOTIPO DO TOTEM ───────────────────────────── */}
      {activeSubTab === 'logo' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Configuração do Logotipo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Envie o logotipo da sua marca ou evento. Se nenhum logotipo for carregado, o topo do aplicativo permanecerá limpo sem nenhuma marca exibida.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="theme-img-upload-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Selecionar Logotipo
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                className="theme-btn-danger-action"
                onClick={() => update('customLogo', null)}
                disabled={!theme.customLogo}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Retirar Logotipo
              </button>

              <span className="personalizacao-limit-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Tamanho máx: 2 MB | PNG transparente recomendado
              </span>
            </div>

            {logoError && <p className="theme-error">{logoError}</p>}

            {theme.customLogo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
                {/* Visualizador da logo */}
                <div>
                  <span className="theme-field-label">Pré-visualização da Logo Atual</span>
                  <div style={{
                    background: '#09090b',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                    minWidth: 200,
                    marginTop: 8,
                  }}>
                    <img 
                      src={theme.customLogo} 
                      alt="Logo carregada" 
                      style={{ 
                        maxHeight: `${theme.logoHeight || 80}px`, 
                        maxWidth: '320px', 
                        objectFit: 'contain' 
                      }} 
                    />
                  </div>
                </div>

                {/* Controle de Altura/Tamanho da Logo */}
                <div className="theme-field" style={{ maxWidth: 360 }}>
                  <span className="theme-field-label">
                    Tamanho visual da logo no topo: {theme.logoHeight || 80}px de altura
                  </span>
                  <input
                    type="range"
                    className="theme-slider"
                    min={40}
                    max={160}
                    step={5}
                    value={theme.logoHeight || 80}
                    onChange={(e) => update('logoHeight', Number(e.target.value))}
                  />
                  <div className="theme-slider-labels">
                    <span>Pequena (40px)</span>
                    <span>Padrão (80px)</span>
                    <span>Grande (160px)</span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className="theme-remove-logo-hero"
                    onClick={() => update('customLogo', null)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Retirar e Excluir Logotipo do Aplicativo
                  </button>
                </div>
              </div>
            ) : (
              <div className="theme-no-logo-notice">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div>
                  <strong>Nenhum logotipo ativo</strong>
                  <p>O aplicativo está configurado sem logotipo. O cabeçalho de todas as telas permanecerá 100% limpo.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ABA 2: PLANO DE FUNDO ──────────────────────────────── */}
      {activeSubTab === 'fundo' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            Plano de Fundo (Cor, Gradiente ou Imagem)
          </h3>

          <div className="theme-bg-mode-tabs">
            {[
              { v: 'solid',    l: 'Cor Sólida' },
              { v: 'gradient', l: 'Gradiente' },
              { v: 'image',    l: 'Imagem de Fundo' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                className={`theme-mode-tab${theme.bgMode === v ? ' active' : ''}`}
                onClick={() => update('bgMode', v)}
              >
                {l}
              </button>
            ))}
          </div>

          {theme.bgMode === 'solid' && (
            <ColorPicker
              label="Cor de Fundo Sólida"
              value={theme.bgColor}
              onChange={(c) => update('bgColor', c)}
            />
          )}

          {theme.bgMode === 'gradient' && (
            <div className="theme-gradient-fields">
              <ColorPicker
                label="Cor Inicial do Gradiente"
                value={theme.bgColor}
                onChange={(c) => update('bgColor', c)}
              />
              <ColorPicker
                label="Cor Final do Gradiente"
                value={theme.bgColorEnd}
                onChange={(c) => update('bgColorEnd', c)}
              />
              <div className="theme-field">
                <span className="theme-field-label">Direção do Gradiente</span>
                <select
                  className="theme-select"
                  value={theme.bgDirection ?? '180deg'}
                  onChange={(e) => update('bgDirection', e.target.value)}
                >
                  {BG_DIRECTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {theme.bgMode === 'image' && (
            <div className="theme-image-field">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="theme-img-upload-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Selecionar Imagem de Fundo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <span className="personalizacao-limit-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Tamanho máx: 5 MB | Recomendado: 1080x1920 (Vertical)
                </span>
              </div>

              {imgError && <p className="theme-error">{imgError}</p>}
              
              {theme.bgImage && (
                <div className="theme-img-preview" style={{ maxWidth: 280, marginTop: 10 }}>
                  <img src={theme.bgImage} alt="Preview do fundo" />
                  <button
                    type="button"
                    className="theme-img-remove"
                    onClick={() => { update('bgImage', null); update('bgMode', 'solid'); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Remover Imagem
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── ABA 3: CORES PRINCIPAIS ───────────────────────────── */}
      {activeSubTab === 'cores' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            Cores Principais (Cores 1, 2 e 3)
          </h3>

          <div className="theme-colors-grid">
            <ColorPicker
              label="Cor 1 (Principal: botões ativos, destaques e ações)"
              value={theme.accent}
              onChange={(c) => update('accent', c)}
            />
            <ColorPicker
              label="Cor 2 (Secundária: hover e bordas com foco)"
              value={theme.accentStrong}
              onChange={(c) => update('accentStrong', c)}
            />
            <ColorPicker
              label="Cor 3 (Complementar: bordas de cards, títulos e linhas)"
              value={theme.color5}
              onChange={(c) => update('color5', c)}
            />
          </div>
        </section>
      )}

      {/* ── ABA 4: TIPOGRAFIA ──────────────────────────────────── */}
      {activeSubTab === 'tipografia' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            Tipografia do Sistema
          </h3>

          <div className="theme-typo-fields">
            <div className="theme-field">
              <span className="theme-field-label">Fonte</span>
              <select
                className="theme-select"
                value={theme.fontFamily}
                onChange={(e) => update('fontFamily', e.target.value)}
              >
                {AVAILABLE_FONTS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="theme-font-preview" style={{ fontFamily: theme.fontFamily }}>
                Totem de Jogos Interativos — Exemplo de Tipografia
              </p>
            </div>

            <div className="theme-field">
              <span className="theme-field-label">
                Tamanho base — {theme.fontSize ?? 16}px
              </span>
              <input
                type="range"
                className="theme-slider"
                min={12}
                max={24}
                step={1}
                value={theme.fontSize ?? 16}
                onChange={(e) => update('fontSize', Number(e.target.value))}
              />
              <div className="theme-slider-labels">
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Pré-visualização Live ─────────────────────────────── */}
      <section className="theme-section theme-preview-section">
        <h3 className="theme-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Pré-visualização dos Botões
        </h3>
        <div className="theme-preview-card">
          <button
            type="button"
            className="theme-preview-btn-primary"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`,
              color: '#000000',
              fontFamily: theme.fontFamily,
              fontSize:   `${theme.fontSize ?? 16}px`,
              fontWeight: 700,
            }}
          >
            Botão Primário
          </button>
          <p
            className="theme-preview-text"
            style={{ fontFamily: theme.fontFamily, fontSize: `${theme.fontSize ?? 16}px` }}
          >
            Texto com a tipografia e cores ativas
          </p>
        </div>
      </section>
    </div>
  );
}

export default Personalizacao;
