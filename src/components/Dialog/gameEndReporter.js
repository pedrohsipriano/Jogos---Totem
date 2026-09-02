// Emissor simples para eventos de fim de jogo
const emitter = new EventTarget();

function reportGameEnd(payload) {
    try {
        const ev = new CustomEvent('gameEnd', { detail: payload });
        emitter.dispatchEvent(ev);
    } catch (e) {
        // Fallback para ambientes que não suportam CustomEvent (muito raro)
        setTimeout(() => {
            emitter.dispatchEvent({ type: 'gameEnd', detail: payload });
        }, 0);
    }
}

function subscribe(fn) {
    const listener = (e) => fn(e.detail);
    emitter.addEventListener('gameEnd', listener);
    return () => emitter.removeEventListener('gameEnd', listener);
}

export { reportGameEnd, subscribe };
