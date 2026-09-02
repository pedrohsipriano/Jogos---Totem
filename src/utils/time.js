// Formata um valor em segundos (pode ser float) para uma string contendo
// apenas os segundos inteiros (zero-padded quando possível), por exemplo: "05", "12", "120".
export function formatSeconds(seconds = 0) {
    const num = Number(seconds) || 0;
    const secs = Math.max(0, Math.floor(num));
    return String(secs).padStart(2, "0");
}

// Converte qualquer tempo numérico para segundos inteiros não negativos.
export function wholeSeconds(seconds = 0) {
    const num = Number(seconds) || 0;
    return Math.max(0, Math.floor(num));
}

// Export padrão mantido para compatibilidade com imports existentes.
export default formatSeconds;
