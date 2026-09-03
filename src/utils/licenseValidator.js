/**
 * licenseValidator.js — Validação de licença do Totem (Híbrido Online & Offline)
 *
 * Funcionalidades:
 * 1. Ativação dinâmica no primeiro uso no Totem (duração em dias/minutos).
 * 2. Validação com data fixa (retrocompatibilidade).
 * 3. Obtenção de horário confiável via rede com fallback offline.
 * 4. Proteção contra relógio desajustado de fábrica (ano < 2025).
 * 5. Proteção anti-rollback com registro da data/hora de início e heartbeat periódico.
 * 6. Assinatura local SHA-256 para integridade no localStorage.
 */

// ─── SEGREDO COMPARTILHADO ────────────────────────────────────────────────────
// DEVE ser idêntico ao do scripts/generate-license.js
const SECRET = 'TOTEM_CNDL_SECRET_2026_#@!';
// ─────────────────────────────────────────────────────────────────────────────

const MIN_REASONABLE_YEAR = 2025;
const STORAGE_PREFIX = '__totem_act_v1_';
const ROLLBACK_KEY = '__totem_time_checkpoint_v1';
const CLOCK_TOLERANCE_MS = 60 * 1000; // 1 minuto de tolerância para oscilações normais

let heartbeatTimer = null;

/**
 * Calcula SHA-256 via Web Crypto API.
 * @param {string} message
 * @returns {Promise<string>} hex digest
 */
async function sha256hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Tenta obter a hora confiável via rede de forma não bloqueante com timeout curto.
 * Se offline ou falhar, utiliza o relógio local do sistema.
 *
 * @param {number} timeoutMs
 * @returns {Promise<{ timestamp: number, source: 'network' | 'local' }>}
 */
async function getTrustedTime(timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.unixtime) {
        return { timestamp: data.unixtime * 1000, source: 'network' };
      }
    }
  } catch {
    clearTimeout(timer);
  }

  // Fallback rápido via cabeçalho HTTP Date
  try {
    const controllerFallback = new AbortController();
    const timerFallback = setTimeout(() => controllerFallback.abort(), 1500);

    const headRes = await fetch(window.location.origin, {
      method: 'HEAD',
      signal: controllerFallback.signal,
      cache: 'no-store',
    });
    clearTimeout(timerFallback);

    const dateHeader = headRes.headers.get('date');
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      if (!Number.isNaN(serverTime) && serverTime > 0) {
        return { timestamp: serverTime, source: 'network' };
      }
    }
  } catch {
    // Fallback completo para relógio local
  }

  return { timestamp: Date.now(), source: 'local' };
}

/**
 * Salva o checkpoint de data/hora atual com assinatura de integridade.
 * @param {number} timestamp
 */
async function recordTimeCheckpoint(timestamp) {
  try {
    const isoDate = new Date(timestamp).toISOString();
    const signature = await sha256hex(`${timestamp}|${isoDate}|rollback|${SECRET}`);
    const record = {
      time: timestamp,
      isoDate,
      signature,
    };
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(record));
  } catch {
    // Falha silenciosa caso o storage esteja inacessível
  }
}

/**
 * Verifica se alguém voltou o horário do aparelho.
 * Compara o timestamp atual com o último horário salvo na inicialização/execução.
 *
 * @param {number} currentTimestamp
 * @returns {Promise<{ tampered: boolean, lastRecordedDate: string|null, currentDate: string }>}
 */
async function checkClockTampering(currentTimestamp) {
  const currentDate = new Date(currentTimestamp).toISOString();

  try {
    const raw = localStorage.getItem(ROLLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.time === 'number' && parsed.signature) {
        const expectedSig = await sha256hex(`${parsed.time}|${parsed.isoDate}|rollback|${SECRET}`);
        
        // Se a assinatura for válida, verifica se o relógio atual é menor que o anterior
        if (parsed.signature === expectedSig) {
          if (currentTimestamp < parsed.time - CLOCK_TOLERANCE_MS) {
            return {
              tampered: true,
              lastRecordedDate: parsed.isoDate,
              currentDate,
            };
          }
        }
      }
    }

    // Se o horário for válido e coerente, atualiza o checkpoint imediatamente
    await recordTimeCheckpoint(currentTimestamp);
  } catch {
    // Não bloqueia por falso-positivo em caso de erro no parse
  }

  return {
    tampered: false,
    lastRecordedDate: null,
    currentDate,
  };
}

/**
 * Inicia o heartbeat periódico enquanto o app estiver aberto,
 * atualizando a cada 30 segundos o último momento em que o totem estava ativo.
 */
export function startClockHeartbeat(onExpiredCallback) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(async () => {
    const now = Date.now();
    await recordTimeCheckpoint(now);

    // Se houver callback para revalidar licença periodicamente
    if (onExpiredCallback) {
      try {
        const check = await validateLicense();
        if (!check.valid) {
          onExpiredCallback(check);
        }
      } catch {}
    }
  }, 30 * 1000);
}

/**
 * Encerra o heartbeat
 */
export function stopClockHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Carrega e valida a licença do Totem.
 */
export async function validateLicense() {
  const BASE_RESULT = {
    valid: false,
    expired: false,
    missing: false,
    invalid: false,
    clockInvalid: false,
    clockTampered: false,
    lastRecordedDate: null,
    currentDate: null,
    daysLeft: 0,
    id: null,
    expireAt: null,
    activatedAt: null,
    timeSource: 'local',
  };

  try {
    // 1. Busca o arquivo de licença do bundle
    const resp = await fetch('/license.key', { cache: 'no-store' });
    if (!resp.ok) return { ...BASE_RESULT, missing: true };

    const encoded = (await resp.text()).trim();
    if (!encoded) return { ...BASE_RESULT, missing: true };

    // 2. Decodifica Base64 -> JSON
    let payload;
    try {
      const decoded = atob(encoded);
      payload = JSON.parse(decoded);
    } catch {
      return { ...BASE_RESULT, invalid: true };
    }

    const { id, hash, type } = payload ?? {};
    if (!id || !hash) return { ...BASE_RESULT, invalid: true };

    // 3. Obter horário confiável (online se disponível, offline local)
    const { timestamp: trustedTime, source: timeSource } = await getTrustedTime();

    // 4. Checagem de ano de reset de fábrica (ex: ano 1970 ou 2000)
    const currentYear = new Date(trustedTime).getFullYear();
    if (currentYear < MIN_REASONABLE_YEAR) {
      return {
        ...BASE_RESULT,
        id,
        clockInvalid: true,
        timeSource,
      };
    }

    // 5. Checagem Anti-Rollback (verificação se o aparelho voltou no tempo)
    const tamperingCheck = await checkClockTampering(trustedTime);
    if (tamperingCheck.tampered) {
      return {
        ...BASE_RESULT,
        id,
        clockTampered: true,
        lastRecordedDate: tamperingCheck.lastRecordedDate,
        currentDate: tamperingCheck.currentDate,
        timeSource,
      };
    }

    let expireMs;
    let expireAtISO;
    let activatedAtISO = null;

    // 6. Tratamento conforme tipo de licença (Dinâmica ou Fixa)
    const isDynamic = type === 'dynamic' || (payload.durationDays !== undefined || payload.durationMinutes !== undefined);

    if (isDynamic) {
      const durationDays = Number(payload.durationDays || payload.days || 0);
      const durationMinutes = Number(payload.durationMinutes || payload.minutes || 0);

      // Valida assinatura da chave dinâmica
      const expectedDynamicHash = await sha256hex(`${id}|dynamic|${durationDays}|${durationMinutes}|${SECRET}`);
      if (hash !== expectedDynamicHash) {
        return { ...BASE_RESULT, id, invalid: true, timeSource };
      }

      const storageKey = `${STORAGE_PREFIX}${id}`;
      let activationData = null;

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          activationData = JSON.parse(stored);
        }
      } catch {
        activationData = null;
      }

      if (activationData?.activatedAt && activationData?.expireAt && activationData?.signature) {
        // Valida a integridade dos dados de ativação locais
        const expectedSig = await sha256hex(`${id}|${activationData.activatedAt}|${activationData.expireAt}|${SECRET}`);
        if (activationData.signature === expectedSig) {
          activatedAtISO = activationData.activatedAt;
          expireAtISO = activationData.expireAt;
          expireMs = new Date(expireAtISO).getTime();
        } else {
          return { ...BASE_RESULT, id, invalid: true, timeSource };
        }
      } else {
        // Primeira ativação no Totem
        const durationMs = durationMinutes > 0
          ? durationMinutes * 60 * 1000
          : durationDays * 24 * 60 * 60 * 1000;

        activatedAtISO = new Date(trustedTime).toISOString();
        expireMs = trustedTime + durationMs;
        expireAtISO = new Date(expireMs).toISOString();

        const signature = await sha256hex(`${id}|${activatedAtISO}|${expireAtISO}|${SECRET}`);
        const toSave = {
          id,
          activatedAt: activatedAtISO,
          expireAt: expireAtISO,
          durationDays,
          durationMinutes,
          signature,
        };

        try {
          localStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch {}
      }
    } else {
      // Licença fixa tradicional (retrocompatibilidade)
      const { expireAt } = payload;
      if (!expireAt) return { ...BASE_RESULT, id, invalid: true, timeSource };

      const expectedFixedHash = await sha256hex(`${id}|${expireAt}|${SECRET}`);
      if (hash !== expectedFixedHash) {
        return { ...BASE_RESULT, id, invalid: true, timeSource };
      }

      expireAtISO = expireAt;
      expireMs = new Date(expireAt).getTime();
    }

    // 7. Avalia expiração
    const expired = expireMs <= trustedTime;
    const daysLeft = Math.max(0, Math.ceil((expireMs - trustedTime) / (1000 * 60 * 60 * 24)));

    return {
      valid: !expired,
      expired,
      missing: false,
      invalid: false,
      clockInvalid: false,
      clockTampered: false,
      daysLeft,
      id,
      expireAt: expireAtISO,
      activatedAt: activatedAtISO,
      timeSource,
    };
  } catch {
    return { ...BASE_RESULT, missing: true };
  }
}
