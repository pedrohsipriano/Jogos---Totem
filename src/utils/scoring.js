/**
 * MÓDULO DE CÁLCULO DE PONTUAÇÃO PADRÃO (scoring.js)
 * Fornece a função utilitária global para calcular a porcentagem de acertos
 * de um jogador em qualquer minijogo da aplicação.
 *
 * @param {number} parcial - Quantidade de itens encontrados, pares acertados ou acertos parciais.
 * @param {number} total - Quantidade total de itens ou objetivos esperados na partida.
 * @returns {number} Valor inteiro representando a pontuação percentual (de 0 a 100).
 */
export const calcularPontos = (parcial, total) => {
    // Prevenção de divisão por zero ou valores totais inválidos
    if (!total || total <= 0) return 0;
    
    // Garante que o valor parcial não seja negativo, divide pelo total e converte para um inteiro percentual
    return Math.floor((Math.max(0, parcial) / total) * 100);
};
