/**
 * GERADOR DE NÚMEROS ALEATÓRIOS DETERMINÍSTICO (random.js)
 * Implementa o algoritmo Mulberry32, um gerador de números pseudoaleatórios (PRNG) de 32 bits.
 * É extremamente rápido e útil quando se deseja que a mesma seed (semente) produza sempre
 * a mesma sequência exata de números aleatórios (ex: para replicar o mesmo tabuleiro ou nível).
 *
 * @param {number} seed - Semente inicial inteira para inicializar o estado do gerador.
 * @returns {() => number} Uma função rng() que, a cada chamada, retorna um float no intervalo [0, 1).
 */
export const mulberry32 = (seed) => {
    // Garante que a semente seja tratada como um inteiro de 32 bits
    let s = seed | 0;
    
    // Retorna a função geradora que mantém o estado 's' em closure
    return function rng() {
        // Avançar o estado interno usando uma constante aditiva com boas propriedades de dispersão
        let t = (s += 0x6d2b79f5);
        // Aplica operações de mistura (tempering) com xor, bitshift e multiplicação inteira (imul)
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        // Converte o resultado final para um número de ponto flutuante entre 0 (inclusivo) e 1 (exclusivo)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
