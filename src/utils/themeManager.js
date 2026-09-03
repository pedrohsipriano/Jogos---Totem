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

/** Calcula contraste (preto ou branco) para manter legibilidade em botões */
export function getContrastColor(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#000000';
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

/** Tema padrão do sistema: 5 cores principais distribuídas pelo sistema */
export const DEFAULT_THEME = {
  // ── As 5 Cores Principais do Sistema ─────────────────────────────────────────
  bgColor: '#000000',       // 1. Plano de Fundo (Fundo da tela / Totem)
  cardBg: '#111111',        // 2. Cards e Telas (Fundo de cards, ranking, modais e teclado)
  color5: '#ffffff',        // 3. Destaque Principal (Bordas neon, botões de início e acentos)
  accentStrong: '#e4e4e7',  // 4. Cor Secundária / Ações (Hover, botões secundários, foco)
  textColor: '#ffffff',     // 5. Cor do Texto (Títulos, números do teclado, textos gerais)

  // Configurações complementares de fundo
  bgMode: 'solid',
  bgColorEnd: '#000000',
  bgDirection: '180deg',
  bgImage: null,

  // Logotipo customizado
  customLogo: null,
  logoHeight: 80, // px

  // Parte de trás das fotos/cartas do Jogo da Memória
  memoryCardBack: null,

  // Tipografia
  fontFamily: 'Grift, sans-serif',
  fontSize: 16, // px
};

// Limpeza de tema legado e remoção definitiva da logo antiga OMNI
(function ensureCleanThemeStartup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj.customLogo === '/images/logo.png' || obj.customLogo === 'null') {
          obj.customLogo = null;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        }
      } catch {}
    }
    localStorage.setItem(THEME_VERSION_KEY, 'true');
  } catch {}
})();

/** Retorna o tema salvo ou o padrão preto e branco. */
export function getTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    const parsed = JSON.parse(raw);
    if (parsed.customLogo === '/images/logo.png' || parsed.customLogo === 'null') {
      parsed.customLogo = null;
    }
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

  // Extrai as 5 cores principais (com fallback retrocompatível)
  const bg = t.bgColor ?? DEFAULT_THEME.bgColor;
  const surface = t.cardBg ?? DEFAULT_THEME.cardBg;
  const primary = t.color5 ?? t.accent ?? DEFAULT_THEME.color5;
  const secondary = t.accentStrong ?? DEFAULT_THEME.accentStrong;
  const text = t.textColor ?? t.cardText ?? DEFAULT_THEME.textColor;

  // Contraste automático para texto em botões com fundo colorido
  const btnText = getContrastColor(primary);

  // 1. Variáveis Base / Raiz
  root.style.setProperty('--bg', bg);
  root.style.setProperty('--Color', bg);
  root.style.setProperty('--Color-5', primary);
  root.style.setProperty('--accent', primary);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--accent-strong', secondary);
  root.style.setProperty('--text-primary', text);

  // 2. Cards e Telas (distribuído)
  root.style.setProperty('--card-bg', surface);
  root.style.setProperty('--card-border', primary);
  root.style.setProperty('--card-text', text);
  root.style.setProperty('--card-btn-bg', primary);
  root.style.setProperty('--card-btn-text', btnText);

  // 3. Ranking (distribuído)
  root.style.setProperty('--ranking-bg', surface);
  root.style.setProperty('--ranking-border', primary);
  root.style.setProperty('--ranking-text', text);

  // 4. Botão Começar o Desafio (distribuído)
  root.style.setProperty('--challenge-btn-bg', primary);
  root.style.setProperty('--challenge-btn-text', btnText);

  // 5. Teclado Virtual (distribuído)
  root.style.setProperty('--keyboard-bg', surface);
  root.style.setProperty('--keyboard-border', primary);
  root.style.setProperty('--keyboard-text', text);
  root.style.setProperty('--keyboard-focus', secondary);
  root.style.setProperty('--keyboard-action-color', secondary);

  // 6. Tela de Vitória / Fim de Jogo (distribuído)
  root.style.setProperty('--victory-bg', surface);
  root.style.setProperty('--victory-border', primary);
  root.style.setProperty('--victory-title', text);
  root.style.setProperty('--victory-badge-bg', secondary);
  root.style.setProperty('--victory-badge-text', getContrastColor(secondary));
  root.style.setProperty('--victory-btn-bg', primary);
  root.style.setProperty('--victory-btn-text', btnText);

  // Parte de trás das fotos/cartas do Jogo da Memória
  if (t.memoryCardBack) {
    root.style.setProperty('--memory-card-back', `url("${t.memoryCardBack}")`);
  } else {
    root.style.removeProperty('--memory-card-back');
  }

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

/** Retorna a imagem atual da parte de trás das cartas do Jogo da Memória. */
export function getMemoryCardBack() {
  const t = getTheme();
  return t.memoryCardBack || null;
}

/** Define a imagem da parte de trás das cartas do Jogo da Memória e persiste. */
export function setMemoryCardBack(imageUrl) {
  const t = getTheme();
  const next = { ...t, memoryCardBack: imageUrl };
  applyAndSaveTheme(next);
}

/** Remove a imagem personalizada e restaura o verso padrão. */
export function removeMemoryCardBack() {
  const t = getTheme();
  const next = { ...t, memoryCardBack: null };
  applyAndSaveTheme(next);
}

