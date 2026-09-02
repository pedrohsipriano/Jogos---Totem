/**
 * MÓDULO AUXILIAR DE MANIPULAÇÃO DE ARRAYS (arrayUtils.js)
 * Fornece a implementação padrão do algoritmo de embaralhamento Fisher-Yates.
 * Mantido como módulo separado para compatibilidade com minijogos que importam deste caminho específico.
 * 
 * @param {Array} arr - O array original contendo os elementos a serem embaralhados.
 * @returns {Array} Um novo array contendo os mesmos elementos em ordem aleatória (preserva a imutabilidade do original).
 */
export const shuffle = (arr) => {
  // Cria uma cópia rasa do array para não modificar o array original passado por referência
  const copy = [...arr];
  
  // Percorre o array de trás para frente trocando o elemento atual com um índice aleatório anterior
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  
  return copy;
};
