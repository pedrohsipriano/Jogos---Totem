/**
 * themeManager.js — Motor de temas visuais do Totem
 *
 * Persiste no localStorage (chave: totem_theme).
 * Aplica as variáveis CSS no documentElement em tempo real.
 */

const STORAGE_KEY = 'totem_theme';

export const AVAILABLE_FONTS = [
  { value: 'Grift, sans-serif',              label: 'Grift (Padrão)' },
  { value: 'Arial, Helvetica, sans-serif',   label: 'Arial' },
  { value: 'Georgia, serif',                 label: 'Georgia' },
  { value: "'Courier New', monospace",       label: 'Courier New' },
  { value: "'Segoe UI', system-ui, sans-serif", label: 'Segoe UI' },
];

/** Paleta de cores predefinidas para os pickers */
export const COLOR_PALETTE = [
  '#00112A', '#0ea5e9', '#38bdf8', '#F60085',
  '#7c3aed', '#10b981', '#f59e0b', '#ef4444',
  '#14b8a6', '#f97316', '#6366f1', '#ec4899',
  '#ffffff', '#94a3b8', '#1f2937', '#000000',
];

/** Tema padrão do sistema */
export const DEFAULT_THEME = {
  // Fundo
  bgMode:        'solid',
  bgColor:       '#000000',
  bgColorEnd:    '#000000',
  bgDirection:   '180deg',     // ângulo do gradiente
  bgImage:       null,         // base64 da imagem

  // Cores base
  accent:        '#ffffff',
  accentStrong:  '#cccccc',
  color5:        '#ffffff',

  // Tipografia
  fontFamily:    'Grift, sans-serif',
  fontSize:      16,           // px
};

/** Retorna o tema salvo ou o padrão. */
export function getTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** Salva o tema no localStorage. */
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* sem espaço no storage — silencioso */
  }
}

/** Reseta o tema para os valores padrão. */
export function resetTheme() {
  localStorage.removeItem(STORAGE_KEY);
  applyTheme(DEFAULT_THEME);
  return { ...DEFAULT_THEME };
}

/** Aplica o tema nas CSS vars do documentElement. */
export function applyTheme(theme = null) {
  const t   = theme ?? getTheme();
  const root = document.documentElement;

  // Cores base
  root.style.setProperty('--accent',       t.accent       ?? DEFAULT_THEME.accent);
  root.style.setProperty('--accent-strong', t.accentStrong ?? DEFAULT_THEME.accentStrong);
  root.style.setProperty('--Color-5',      t.color5       ?? DEFAULT_THEME.color5);

  // Tipografia
  root.style.setProperty('--font-family',  t.fontFamily   ?? DEFAULT_THEME.fontFamily);
  root.style.setProperty('--font-size-base', `${t.fontSize ?? DEFAULT_THEME.fontSize}px`);
  document.body.style.fontFamily = t.fontFamily ?? DEFAULT_THEME.fontFamily;

  // Fundo
  _applyBackground(t);
}

function _applyBackground(t) {
  const html = document.documentElement;

  if (t.bgMode === 'image' && t.bgImage) {
    html.style.background = `url("${t.bgImage}") center / cover no-repeat fixed`;
    html.style.backgroundAttachment = 'fixed';
    return;
  }

  if (t.bgMode === 'solid') {
    html.style.background = t.bgColor ?? DEFAULT_THEME.bgColor;
    return;
  }

  // gradient (padrão)
  const dir   = t.bgDirection ?? DEFAULT_THEME.bgDirection;
  const start = t.bgColor     ?? DEFAULT_THEME.bgColor;
  const end   = t.bgColorEnd  ?? DEFAULT_THEME.bgColorEnd;
  html.style.background = `linear-gradient(${dir}, ${start} 0%, ${end} 100%)`;
  html.style.backgroundAttachment = 'fixed';
}

/** Salva e aplica o tema ao mesmo tempo. */
export function applyAndSaveTheme(theme) {
  saveTheme(theme);
  applyTheme(theme);
}
