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

const THEME_VERSION_KEY = 'totem_theme_v4_nologo';

/** Tema padrão do sistema: Preto e Branco puro sem nenhum logotipo */
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

  // Personalização dos Cards de Jogos
  cardBg: '#111111',       // Fundo do card
  cardBorder: '#ffffff',   // Borda do card
  cardText: '#ffffff',     // Título e textos do card
  cardBtnBg: '#ffffff',    // Fundo do botão Começar
  cardBtnText: '#000000',  // Texto do botão Começar

  // Personalização do Ranking
  rankingBg: '#111111',     // Fundo do card de ranking
  rankingBorder: '#ffffff', // Borda do card e tabela do ranking
  rankingText: '#ffffff',   // Textos e títulos do ranking

  // Personalização do Botão Começar o Desafio
  challengeBtnBg: '#ffffff',   // Fundo do botão Começar o desafio
  challengeBtnText: '#000000', // Texto do botão Começar o desafio

  // Logotipo customizado (base64 ou URL) e altura em px
  customLogo: null,
  logoHeight: 80, // px

  // Parte de trás das fotos/cartas do Jogo da Memória
  memoryCardBack: null,

  // Personalização do Teclado Virtual
  keyboardBg: 'rgba(2, 18, 41, 0.75)',       // Fundo do teclado
  keyboardBorder: 'rgba(255, 255, 255, 0.2)', // Borda do teclado
  keyboardText: '#ffffff',                   // Cor das teclas / números
  keyboardFocus: '#07BCEE',                  // Cor de destaque "Digitando em: ..."
  keyboardActionColor: '#ef4444',            // Cor dos botões "Limpar" e "←"

  // Personalização da Tela de Vitória / Fim de Jogo (Modal de Resultado)
  victoryBg: 'rgba(0, 0, 0, 0.85)',           // Fundo da janela de vitória
  victoryBorder: '#ffffff',                   // Borda da janela e caixas
  victoryTitle: '#ffffff',                    // Cor do título "Voce venceu!"
  victoryBadgeBg: 'rgba(255, 255, 255, 0.15)', // Fundo das tags de pontuação e tempo
  victoryBadgeText: '#ffffff',                // Texto das tags de pontuação e tempo
  victoryBtnBg: '#ffffff',                    // Fundo do botão "Voltar ao Cadastro"
  victoryBtnText: '#000000',                  // Texto do botão "Voltar ao Cadastro"

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

  // Cores base (Preto e Branco)
  root.style.setProperty('--accent', t.accent ?? DEFAULT_THEME.accent);
  root.style.setProperty('--accent-strong', t.accentStrong ?? DEFAULT_THEME.accentStrong);
  root.style.setProperty('--Color-5', t.color5 ?? DEFAULT_THEME.color5);
  root.style.setProperty('--Color', '#000000');
  root.style.setProperty('--bg', t.bgColor ?? DEFAULT_THEME.bgColor);
  root.style.setProperty('--primary', t.accent ?? DEFAULT_THEME.accent);

  // Cores customizadas dos Cards
  root.style.setProperty('--card-bg', t.cardBg ?? DEFAULT_THEME.cardBg);
  root.style.setProperty('--card-border', t.cardBorder ?? DEFAULT_THEME.cardBorder);
  root.style.setProperty('--card-text', t.cardText ?? DEFAULT_THEME.cardText);
  root.style.setProperty('--card-btn-bg', t.cardBtnBg ?? DEFAULT_THEME.cardBtnBg);
  root.style.setProperty('--card-btn-text', t.cardBtnText ?? DEFAULT_THEME.cardBtnText);

  // Cores customizadas do Ranking
  root.style.setProperty('--ranking-bg', t.rankingBg ?? t.cardBg ?? DEFAULT_THEME.rankingBg);
  root.style.setProperty('--ranking-border', t.rankingBorder ?? t.cardBorder ?? DEFAULT_THEME.rankingBorder);
  root.style.setProperty('--ranking-text', t.rankingText ?? t.cardText ?? DEFAULT_THEME.rankingText);

  // Cores do botão Começar o Desafio
  root.style.setProperty('--challenge-btn-bg', t.challengeBtnBg ?? DEFAULT_THEME.challengeBtnBg);
  root.style.setProperty('--challenge-btn-text', t.challengeBtnText ?? DEFAULT_THEME.challengeBtnText);

  // Parte de trás das fotos/cartas do Jogo da Memória
  if (t.memoryCardBack) {
    root.style.setProperty('--memory-card-back', `url("${t.memoryCardBack}")`);
  } else {
    root.style.removeProperty('--memory-card-back');
  }

  // Cores do Teclado Virtual
  root.style.setProperty('--keyboard-bg', t.keyboardBg ?? DEFAULT_THEME.keyboardBg);
  root.style.setProperty('--keyboard-border', t.keyboardBorder ?? DEFAULT_THEME.keyboardBorder);
  root.style.setProperty('--keyboard-text', t.keyboardText ?? DEFAULT_THEME.keyboardText);
  root.style.setProperty('--keyboard-focus', t.keyboardFocus ?? DEFAULT_THEME.keyboardFocus);
  root.style.setProperty('--keyboard-action-color', t.keyboardActionColor ?? DEFAULT_THEME.keyboardActionColor);

  // Cores da Tela de Vitória / Fim de Jogo
  root.style.setProperty('--victory-bg', t.victoryBg ?? DEFAULT_THEME.victoryBg);
  root.style.setProperty('--victory-border', t.victoryBorder ?? DEFAULT_THEME.victoryBorder);
  root.style.setProperty('--victory-title', t.victoryTitle ?? DEFAULT_THEME.victoryTitle);
  root.style.setProperty('--victory-badge-bg', t.victoryBadgeBg ?? DEFAULT_THEME.victoryBadgeBg);
  root.style.setProperty('--victory-badge-text', t.victoryBadgeText ?? DEFAULT_THEME.victoryBadgeText);
  root.style.setProperty('--victory-btn-bg', t.victoryBtnBg ?? DEFAULT_THEME.victoryBtnBg);
  root.style.setProperty('--victory-btn-text', t.victoryBtnText ?? DEFAULT_THEME.victoryBtnText);

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

