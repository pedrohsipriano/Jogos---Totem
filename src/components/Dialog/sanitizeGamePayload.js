export function sanitizeGamePayload(payload) {
    const game = payload && payload.game ? String(payload.game) : "";
    const score = Number(payload?.score ?? payload?.points ?? 0) || 0;
    const remainingSeconds = Math.max(0, Math.floor(Number(payload?.remainingSeconds ?? 0) || 0));
    const timedOut = !!payload?.timedOut;

    return { game, score, remainingSeconds, timedOut };
}

export default sanitizeGamePayload;
