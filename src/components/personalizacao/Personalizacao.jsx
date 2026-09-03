import { useState, useCallback } from 'react';
import {
  getTheme,
  saveTheme,
  applyTheme,
  resetTheme,
  DEFAULT_THEME,
  AVAILABLE_FONTS,
  COLOR_PALETTE,
  getContrastColor,
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
function ColorPicker({ label, description, value, onChange }) {
  return (
    <div className="theme-color-picker">
      <span className="theme-field-label">{label}</span>
      {description && (
        <span style={{ fontSize: 12, color: '#94a3b8', marginTop: -4, marginBottom: 6, display: 'block' }}>
          {description}
        </span>
      )}
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
  const [activeSubTab, setActiveSubTab] = useState('cores');
  const [saved,        setSaved]        = useState(false);
  const [imgError,     setImgError]     = useState('');
  const [logoError,    setLogoError]    = useState('');
  const [cardBackErr,  setCardBackErr]  = useState('');

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

  const handleCardBackUpload = (e) => {
    setCardBackErr('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setCardBackErr('Arquivo muito grande. O verso da carta deve ter no máximo 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      update('memoryCardBack', ev.target.result);
    };
    reader.onerror = () => setCardBackErr('Erro ao carregar o verso da carta.');
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    setImgError('');
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Cores ativas consolidadas para os previews
  const currentBg = theme.bgColor || '#000000';
  const currentCardBg = theme.cardBg || '#111111';
  const currentPrimary = theme.color5 || theme.accent || '#ffffff';
  const currentSecondary = theme.accentStrong || '#e4e4e7';
  const currentText = theme.textColor || theme.cardText || '#ffffff';
  const btnTextColor = getContrastColor(currentPrimary);

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

      {/* ── Sub-navegação em 3 Abas Principais ──────────────────────────────── */}
      <div className="personalizacao-nav-tabs">
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
          className={`personalizacao-nav-tab${activeSubTab === 'logo' ? ' active' : ''}`}
          onClick={() => setActiveSubTab('logo')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Logotipo e Imagens
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

      {/* ── ABA 1: CORES PRINCIPAIS DO SISTEMA ─────────────────────── */}
      {activeSubTab === 'cores' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            Cores Principais do Sistema
          </h3>

          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Configure as 5 cores que definem a identidade visual do Totem. O sistema distribui essas cores automaticamente por todos os jogos, cards, teclado virtual e janelas de vitória.
          </p>

          {/* Grid das 5 Cores Principais */}
          <div className="theme-colors-grid" style={{ marginTop: 10 }}>
            <ColorPicker
              label="1. Plano de Fundo"
              description="Fundo de todas as telas e do totem"
              value={currentBg}
              onChange={(c) => update('bgColor', c)}
            />
            <ColorPicker
              label="2. Cards e Telas"
              description="Fundo dos cards de jogos, ranking, teclado e janela final"
              value={currentCardBg}
              onChange={(c) => update('cardBg', c)}
            />
            <ColorPicker
              label="3. Destaque Principal"
              description="Bordas neon, botões Começar, títulos e acentos principais"
              value={currentPrimary}
              onChange={(c) => {
                update('color5', c);
                update('accent', c);
              }}
            />
            <ColorPicker
              label="4. Cor Secundária / Ações"
              description="Hover de botões, botões de ação do teclado, badges de tempo e pontos"
              value={currentSecondary}
              onChange={(c) => update('accentStrong', c)}
            />
            <ColorPicker
              label="5. Cor do Texto"
              description="Títulos dos cards, textos gerais e letras/números do teclado"
              value={currentText}
              onChange={(c) => {
                update('textColor', c);
                update('cardText', c);
              }}
            />
          </div>

          {/* Opções de Modo do Plano de Fundo */}
          <div style={{ marginTop: 30, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20 }}>
            <h4 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 12px 0' }}>Estilo do Plano de Fundo</h4>
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

            {theme.bgMode === 'gradient' && (
              <div className="theme-gradient-fields" style={{ marginTop: 14 }}>
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

                <div className="theme-field" style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                  <span className="theme-field-label">
                    Posição da Transição do Gradiente — {theme.bgGradientStop ?? 50}%
                  </span>
                  <input
                    type="range"
                    className="theme-slider"
                    min={5}
                    max={95}
                    step={1}
                    value={theme.bgGradientStop ?? 50}
                    onChange={(e) => update('bgGradientStop', Number(e.target.value))}
                  />
                  <div className="theme-slider-labels">
                    <span>Mais para Cima (5%)</span>
                    <span>Meio da Tela (50%)</span>
                    <span>Mais para Baixo (95%)</span>
                  </div>
                </div>
              </div>
            )}

            {theme.bgMode === 'image' && (
              <div className="theme-image-field" style={{ marginTop: 14 }}>
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
                  <>
                    <div className="theme-field" style={{ maxWidth: 360, marginTop: 14 }}>
                      <span className="theme-field-label">
                        Opacidade da Imagem de Fundo — {theme.bgImageOpacity ?? 100}%
                      </span>
                      <input
                        type="range"
                        className="theme-slider"
                        min={10}
                        max={100}
                        step={5}
                        value={theme.bgImageOpacity ?? 100}
                        onChange={(e) => update('bgImageOpacity', Number(e.target.value))}
                      />
                      <div className="theme-slider-labels">
                        <span>Suave (10%)</span>
                        <span>Média (50%)</span>
                        <span>Total (100%)</span>
                      </div>
                    </div>

                    <div className="theme-img-preview" style={{ maxWidth: 280, marginTop: 10 }}>
                      <img 
                        src={theme.bgImage} 
                        alt="Preview do fundo" 
                        style={{ opacity: (theme.bgImageOpacity ?? 100) / 100 }}
                      />
                      <button
                        type="button"
                        className="theme-img-remove"
                        onClick={() => { update('bgImage', null); update('bgMode', 'solid'); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Remover Imagem
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── PRÉ-VISUALIZAÇÃO INTEGRADA DAS 5 CORES ── */}
          <div style={{ marginTop: 32, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 24 }}>
            <span className="theme-field-label">Distribuição das Cores nos Elementos do Jogo</span>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 16px 0' }}>
              Veja abaixo como as 5 cores são aplicadas simultaneamente nos Cards, no Teclado Virtual e na Janela de Fim de Jogo.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              background: theme.bgMode === 'gradient'
                ? `linear-gradient(${theme.bgDirection || '180deg'}, ${theme.bgColor || '#000000'} 0%, ${theme.bgGradientStop ?? 50}%, ${theme.bgColorEnd || '#000000'} 100%)`
                : (theme.bgMode === 'image' && theme.bgImage 
                    ? `linear-gradient(rgba(0,0,0,${1 - (theme.bgImageOpacity ?? 100) / 100}), rgba(0,0,0,${1 - (theme.bgImageOpacity ?? 100) / 100})), url("${theme.bgImage}") center / cover`
                    : currentBg),
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: 18,
              padding: 24,
            }}>
              {/* Preview 1: Card de Jogo */}
              <div style={{
                background: currentCardBg,
                border: `2px solid ${currentPrimary}`,
                borderRadius: 16,
                padding: '20px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}>
                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: currentSecondary, fontWeight: 700 }}>
                    Exemplo de Card
                  </span>
                  <h4 style={{ color: currentText, fontSize: 20, fontWeight: 700, margin: '8px 0 0 0', fontFamily: theme.fontFamily }}>
                    Caça-Palavras
                  </h4>
                </div>
                <button
                  type="button"
                  style={{
                    background: currentPrimary,
                    color: btnTextColor,
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: theme.fontFamily,
                    cursor: 'default',
                    marginTop: 16,
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Começar a jogar
                </button>
              </div>

              {/* Preview 2: Teclado Virtual */}
              <div style={{
                background: currentCardBg,
                border: `2px solid ${currentPrimary}`,
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: currentSecondary, fontWeight: 700 }}>
                  Teclado Virtual
                </span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {['Q', 'W', 'E', 'R', 'T', 'Y'].map((l) => (
                    <div
                      key={l}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: currentText,
                        borderRadius: 6,
                        width: 32,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        fontFamily: theme.fontFamily,
                      }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                  <div
                    style={{
                      background: currentSecondary,
                      color: getContrastColor(currentSecondary),
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Limpar
                  </div>
                  <div
                    style={{
                      background: currentPrimary,
                      color: btnTextColor,
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Confirmar
                  </div>
                </div>
              </div>

              {/* Preview 3: Janela de Vitória */}
              <div style={{
                background: currentCardBg,
                border: `2px solid ${currentPrimary}`,
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: currentSecondary, fontWeight: 700 }}>
                  Fim de Jogo
                </span>
                <h4 style={{ color: currentText, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: theme.fontFamily }}>
                  Você venceu!
                </h4>
                <div style={{
                  background: currentSecondary,
                  color: getContrastColor(currentSecondary),
                  padding: '4px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  100 pontos
                </div>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: currentPrimary,
                    color: btnTextColor,
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'default',
                    marginTop: 6,
                  }}
                >
                  Voltar ao Cadastro
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ABA 2: LOGOTIPO E IMAGENS ───────────────────────────── */}
      {activeSubTab === 'logo' && (
        <section className="theme-section">
          <h3 className="theme-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Logotipo e Imagens do Totem
          </h3>

          {/* Configuração do Logotipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              Envie o logotipo da sua marca ou evento. Se nenhum logotipo for carregado, o topo do aplicativo permanecerá limpo.
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
              </div>
            ) : (
              <div className="theme-no-logo-notice">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div>
                  <strong>Nenhum logotipo ativo</strong>
                  <p>O cabeçalho de todas as telas permanecerá 100% limpo.</p>
                </div>
              </div>
            )}
          </div>

          {/* Verso da Carta do Jogo da Memória */}
          <div style={{ marginTop: 30, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20 }}>
            <h4 style={{ color: '#f8fafc', fontSize: 15, margin: '0 0 8px 0' }}>Verso das Cartas (Jogo da Memória)</h4>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 14px 0' }}>
              Personalize o verso das cartas que ficam viradas no Jogo da Memória com uma estampa ou logotipo exclusivo.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="theme-img-upload-label">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Selecionar Verso da Carta
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCardBackUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="button"
                className="theme-btn-danger-action"
                onClick={() => update('memoryCardBack', null)}
                disabled={!theme.memoryCardBack}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Restaurar Verso Padrão
              </button>
            </div>

            {cardBackErr && <p className="theme-error">{cardBackErr}</p>}

            {theme.memoryCardBack && (
              <div style={{ marginTop: 14 }}>
                <span className="theme-field-label">Pré-visualização do Verso</span>
                <div style={{
                  width: 90,
                  height: 120,
                  borderRadius: 12,
                  border: `2px solid ${currentPrimary}`,
                  backgroundImage: `url("${theme.memoryCardBack}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  marginTop: 8,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ABA 3: TIPOGRAFIA ──────────────────────────────────── */}
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
    </div>
  );
}

export default Personalizacao;
