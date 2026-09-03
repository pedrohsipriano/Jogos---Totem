/**
 * themeManager.js — Motor de temas visuais do Totem (Padrão Preto e Branco)
 *
 * Persiste no localStorage (chave: totem_theme).
 * Aplica as variáveis CSS no documentElement em tempo real.
 */

const STORAGE_KEY = 'totem_theme';

export const AVAILABLE_FONTS = [
  { value: 'Grift, sans-serif', label: 'Grift (Padrão)' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: "'Segoe UI', system-ui, sans-serif", label: 'Segoe UI' },
];

/** Paleta de cores para os pickers (iniciando pelos tons neutros) */
export const COLOR_PALETTE = [
  '#000000', '#18181b', '#27272a', '#71717a',
  '#a1a1aa', '#e4e4e7', '#f4f4f5', '#ffffff',
  '#38bdf8', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#7c3aed', '#ec4899', '#F60085',
];

const THEME_VERSION_KEY = 'totem_theme_v3_bw';

/** Tema padrão do sistema: Preto e Branco puro */
export const DEFAULT_THEME = {
  // Fundo
  bgMode: 'solid',
  bgColor: '#000000',
  bgColorEnd: '#000000',
  bgDirection: '180deg',
  bgImage: null,

  // Cores base (1, 2, 3)
  accent: '#ffffff',       // Cor 1: Principal (Botões e destaques primários)
  accentStrong: '#e4e4e7', // Cor 2: Secundária (Hover e bordas ativas)
  color5: '#ffffff',       // Cor 3: Complementar (Bordas de cards e títulos)

  // Logotipo customizado (base64 ou URL)
  customLogo: null,

  // Tipografia
  fontFamily: 'Grift, sans-serif',
  fontSize: 16, // px
};

// Limpeza de tema legado (caso o totem tenha cores antigas salvas)
(function ensureCleanThemeStartup() {
  try {
    if (!localStorage.getItem(THEME_VERSION_KEY)) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && (raw.includes('F60085') || raw.includes('021229') || raw.includes('07bcee'))) {
        localStorage.removeItem(STORAGE_KEY);
      }
      localStorage.setItem(THEME_VERSION_KEY, 'true');
    }
  } catch {}
})();

/** Retorna o tema salvo ou o padrão preto e branco. */
export function getTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** Salva o tema no localStorage. */
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    window.dispatchEvent(new CustomEvent('totem_theme_changed', { detail: theme }));
  } catch {
    /* sem espaço no storage — silencioso */
  }
}

/** Reseta o tema para os valores padrão preto e branco. */
export function resetTheme() {
  localStorage.removeItem(STORAGE_KEY);
  applyTheme(DEFAULT_THEME);
  window.dispatchEvent(new CustomEvent('totem_theme_changed', { detail: DEFAULT_THEME }));
  return { ...DEFAULT_THEME };
}

/** Aplica o tema nas CSS vars do documentElement. */
export function applyTheme(theme = null) {
  const t = theme ?? getTheme();
  const root = document.documentElement;

  // Cores base (Preto e Branco)
  root.style.setProperty('--accent', t.accent ?? DEFAULT_THEME.accent);
  root.style.setProperty('--accent-strong', t.accentStrong ?? DEFAULT_THEME.accentStrong);
  root.style.setProperty('--Color-5', t.color5 ?? DEFAULT_THEME.color5);
  root.style.setProperty('--Color', '#000000');
  root.style.setProperty('--bg', t.bgColor ?? DEFAULT_THEME.bgColor);
  root.style.setProperty('--primary', t.accent ?? DEFAULT_THEME.accent);

  // Tipografia
  root.style.setProperty('--font-family', t.fontFamily ?? DEFAULT_THEME.fontFamily);
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

  // gradient
  const dir = t.bgDirection ?? DEFAULT_THEME.bgDirection;
  const start = t.bgColor ?? DEFAULT_THEME.bgColor;
  const end = t.bgColorEnd ?? DEFAULT_THEME.bgColorEnd;
  html.style.background = `linear-gradient(${dir}, ${start} 0%, ${end} 100%)`;
  html.style.backgroundAttachment = 'fixed';
}

/** Salva e aplica o tema ao mesmo tempo. */
export function applyAndSaveTheme(theme) {
  saveTheme(theme);
  applyTheme(theme);
}
