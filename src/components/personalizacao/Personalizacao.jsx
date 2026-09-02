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
  const [theme,   setThemeState] = useState(() => getTheme());
  const [saved,   setSaved]      = useState(false);
  const [imgError, setImgError]  = useState('');

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

  const handleImageUpload = (e) => {
    setImgError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImgError('Imagem muito grande. Máximo: 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      update('bgImage', ev.target.result);
      update('bgMode',  'image');
    };
    reader.onerror = () => setImgError('Erro ao carregar a imagem.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="personalizacao-container">
      <div className="personalizacao-header">
        <div>
          <p className="eyebrow">Aparência</p>
          <h2>Personalização</h2>
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

      {/* ── Fundo ─────────────────────────────────────────────── */}
      <section className="theme-section">
        <h3 className="theme-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Plano de Fundo
        </h3>

        <div className="theme-bg-mode-tabs">
          {[
            { v: 'solid',    l: 'Cor Sólida' },
            { v: 'gradient', l: 'Gradiente' },
            { v: 'image',    l: 'Imagem' },
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
            label="Cor de fundo"
            value={theme.bgColor}
            onChange={(c) => update('bgColor', c)}
          />
        )}

        {theme.bgMode === 'gradient' && (
          <div className="theme-gradient-fields">
            <ColorPicker
              label="Cor inicial"
              value={theme.bgColor}
              onChange={(c) => update('bgColor', c)}
            />
            <ColorPicker
              label="Cor final"
              value={theme.bgColorEnd}
              onChange={(c) => update('bgColorEnd', c)}
            />
            <div className="theme-field">
              <span className="theme-field-label">Direção</span>
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
            <label className="theme-img-upload-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Selecionar imagem
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
            {imgError && <p className="theme-error">{imgError}</p>}
            {theme.bgImage && (
              <div className="theme-img-preview">
                <img src={theme.bgImage} alt="Preview do fundo" />
                <button
                  type="button"
                  className="theme-img-remove"
                  onClick={() => { update('bgImage', null); update('bgMode', 'gradient'); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Remover
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Cores Base ────────────────────────────────────────── */}
      <section className="theme-section">
        <h3 className="theme-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Cores Base
        </h3>

        <div className="theme-colors-grid">
          <ColorPicker
            label="Cor Base 1 (destaques / botões)"
            value={theme.accent}
            onChange={(c) => update('accent', c)}
          />
          <ColorPicker
            label="Cor Base 2 (hover / bordas ativas)"
            value={theme.accentStrong}
            onChange={(c) => update('accentStrong', c)}
          />
          <ColorPicker
            label="Cor Base 3 (destaque secundário)"
            value={theme.color5}
            onChange={(c) => update('color5', c)}
          />
        </div>
      </section>

      {/* ── Tipografia ────────────────────────────────────────── */}
      <section className="theme-section">
        <h3 className="theme-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Tipografia
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
              Convecao CDL — Preview da Fonte
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

      {/* ── Preview Live ──────────────────────────────────────── */}
      <section className="theme-section theme-preview-section">
        <h3 className="theme-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </h3>
        <div className="theme-preview-card">
          <button
            type="button"
            className="theme-preview-btn-primary"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`,
              fontFamily: theme.fontFamily,
              fontSize:   `${theme.fontSize ?? 16}px`,
            }}
          >
            Botão Primário
          </button>
          <p
            className="theme-preview-text"
            style={{ fontFamily: theme.fontFamily, fontSize: `${theme.fontSize ?? 16}px` }}
          >
            Texto de exemplo com a fonte selecionada
          </p>
        </div>
      </section>
    </div>
  );
}

export default Personalizacao;
