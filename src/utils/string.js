/**
 * UTILITÁRIO DE NORMALIZAÇÃO DE STRINGS (string.js)
 * Fornece funções para padronização de textos, removendo acentuação e padronizando
 * o uso de maiúsculas. É essencial para garantir que as comparações de entrada do usuário
 * com as palavras-alvo funcionem corretamente em jogos como Caça-Palavras, Forca e Soletra.
 *
 * @param {string} text - A string de entrada a ser normalizada.
 * @returns {string} String resultante em letras maiúsculas e sem caracteres diacríticos (acentos).
 */
export const normalizeText = (text) =>
    (text || "")
        // Decompõe os caracteres acentuados em suas partes base e marcas diacríticas (Forma Normal de Decomposição - NFD)
        .normalize("NFD")
        // Remove via expressão regular todas as marcas diacríticas (intervalo Unicode u0300 a u036f)
        .replace(/[\u0300-\u036f]/g, "")
        // Converte o resultado final para letras maiúsculas
        .toUpperCase();
