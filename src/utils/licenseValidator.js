/**
 * licenseValidator.js — Validação de licença offline do Totem
 *
 * Lê o arquivo /license.key (Base64 JSON), verifica a assinatura SHA-256
 * e se a data de expiração ainda é válida.
 */

// ─── SEGREDO COMPARTILHADO ────────────────────────────────────────────────────
// DEVE ser idêntico ao do scripts/generate-license.js
const SECRET = 'TOTEM_CNDL_SECRET_2026_#@!';
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula SHA-256 via Web Crypto API (disponível em todos os browsers modernos).
 * @param {string} message
 * @returns {Promise<string>} hex digest
 */
async function sha256hex(message) {
  const encoder = new TextEncoder();
  const data    = encoder.encode(message);
  const buffer  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Carrega e valida a licença.
 *
 * @returns {Promise<{
 *   valid: boolean,
 *   expired: boolean,
 *   missing: boolean,
 *   daysLeft: number,
 *   id: string|null,
 *   expireAt: string|null,
 * }>}
 */
export async function validateLicense() {
  const MISSING = { valid: false, expired: false, missing: true, daysLeft: 0, id: null, expireAt: null };
  const INVALID = { valid: false, expired: false, missing: false, daysLeft: 0, id: null, expireAt: null };

  try {
    // Busca o arquivo de licença do bundle
    const resp = await fetch('/license.key', { cache: 'no-store' });
    if (!resp.ok) return MISSING;

    const encoded = (await resp.text()).trim();
    if (!encoded) return MISSING;

    // Decodifica Base64 → JSON
    let payload;
    try {
      const decoded = atob(encoded);
      payload = JSON.parse(decoded);
    } catch {
      return INVALID;
    }

    const { id, expireAt, hash } = payload ?? {};
    if (!id || !expireAt || !hash) return INVALID;

    // Verifica o hash SHA-256
    const expectedHash = await sha256hex(`${id}|${expireAt}|${SECRET}`);
    if (hash !== expectedHash) return INVALID;

    // Verifica expiração
    const now       = Date.now();
    const expireMs  = new Date(expireAt).getTime();
    const daysLeft  = Math.max(0, Math.ceil((expireMs - now) / (1000 * 60 * 60 * 24)));
    const expired   = expireMs <= now;

    return {
      valid:    !expired,
      expired,
      missing:  false,
      daysLeft,
      id,
      expireAt,
    };
  } catch {
    return MISSING;
  }
}
