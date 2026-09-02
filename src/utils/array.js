/**
 * Implementação do algoritmo de embaralhamento Fisher–Yates (Knuth shuffle).
 * Este utilitário garante uma distribuição perfeitamente aleatória e uniforme
 * para os elementos de um array, sendo fundamental para randomizar posições e palavras no jogo.
 *
 * @param {Array} arr — O array original a ser embaralhado. O array original NÃO é modificado (imutabilidade).
 * @param {() => number} [rng=Math.random] — Função geradora de números aleatórios, retornando um float no intervalo [0, 1).
 * @returns {Array} Uma nova instância de array contendo os mesmos elementos em ordem aleatória.
 */
export function shuffle(arr, rng = Math.random) {
    // Cria uma cópia rasa (shallow copy) do array de entrada para preservar a imutabilidade do original
    const copy = [...arr];

    // Percorre o array de trás para frente, escolhendo um índice aleatório 'j'
    // entre 0 e o índice atual 'i', e troca os elementos de posição.
    for (let i = copy.length - 1; i > 0; i -= 1) {
        // Calcula um índice aleatório j tal que 0 <= j <= i
        const j = Math.floor(rng() * (i + 1));

        // Realiza a troca (swap) dos elementos nas posições i e j usando desestruturação (destructuring)
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    // Retorna o novo array devidamente embaralhado
    return copy;
}
