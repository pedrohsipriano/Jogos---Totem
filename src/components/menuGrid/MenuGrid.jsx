import "./menuGrid.style.css";

/**
 * COMPONENTE GRADE DO MENU PRINCIPAL (MenuGrid.jsx)
 * Responsável por renderizar a grade de cartões (tiles) com os minijogos disponíveis e o painel administrativo.
 * Cada cartão exibe o título do jogo, descrição, controles de configuração dinâmicos específicos daquele jogo
 * (como tempo de partida, tamanho da grade, limites de palavras/perguntas) e o botão para iniciar a partida.
 *
 * @param {Object} props - Propriedades recebidas do componente orquestrador (App).
 * @param {Array} props.games - Lista de objetos representando os minijogos cadastrados.
 * @param {Object} props.timeLimits - Mapa com os tempos máximos configurados por ID de jogo.
 * @param {Object} props.catchInitialFallTimes - Mapa com os tempos iniciais de queda para a Cesta de Ofertas.
 * @param {Object} props.wordSearchWordLimits - Mapa com o limite de palavras selecionado para o Caça-Palavras.
 * @param {Object} props.wordSearchWordBounds - Limites mínimo e máximo de palavras disponíveis no banco para o Caça-Palavras.
 * @param {Object} props.hangmanWordLengths - Mapa com a quantidade de letras configurada para a Forca.
 * @param {Object} props.labirintoWordLengths - Mapa com a quantidade de letras configurada para o Labirinto.
 * @param {Object} props.pairsLimits - Mapa com a quantidade de pares configurada para o Jogo da Memória.
 * @param {Object} props.gridSizes - Mapa com os tamanhos de grade (ex: 12 slots, 10x10) por ID de jogo.
 * @param {Object} props.quizQuestionBounds - Limites mínimo e máximo de perguntas disponíveis no banco para o Quiz.
 * @param {Object} props.quizQuestionLimits - Mapa com o limite de perguntas selecionado para o Quiz.
 * @param {Object} props.soletraWordBounds - Limites mínimo e máximo de palavras disponíveis no banco para o Soletra.
 * @param {Object} props.soletraWordLimits - Mapa com o limite de palavras selecionado para o Soletra.
 * @param {Function} props.onTimeLimitChange - Callback acionada ao alterar o tempo máximo de um jogo.
 * @param {Function} props.onCatchInitialFallTimeChange - Callback acionada ao alterar a velocidade da Cesta de Ofertas.
 * @param {Function} props.onWordSearchWordLimitChange - Callback acionada ao alterar a quantidade de palavras no Caça-Palavras.
 * @param {Function} props.onHangmanWordLengthChange - Callback acionada ao alterar a quantidade de letras na Forca.
 * @param {Function} props.onLabirintoWordLengthChange - Callback acionada ao alterar a quantidade de letras no Labirinto.
 * @param {Function} props.onPairsChange - Callback acionada ao alterar a quantidade de pares no Jogo da Memória.
 * @param {Function} props.onGridSizeChange - Callback acionada ao alterar o tamanho da grade de um jogo.
 * @param {Function} props.onQuizLimitChange - Callback acionada ao alterar a quantidade de perguntas no Quiz.
 * @param {Function} props.onSoletraWordLimitChange - Callback acionada ao alterar a quantidade de palavras no Soletra.
 * @param {Function} props.onOpenAdminHub - Callback acionada ao clicar para abrir o painel administrativo.
 * @param {Function} props.onSelect - Callback acionada ao clicar em "Jogar agora" passando o ID do jogo escolhido.
 */
export default function MenuGrid({
  games,
  timeLimits,
  catchInitialFallTimes,
  wordSearchWordLimits,
  wordSearchWordBounds,
  hangmanWordLengths,
  labirintoWordLengths,
  pairsLimits,
  gridSizes,
  quizQuestionBounds,
  quizQuestionLimits,
  soletraWordBounds,
  soletraWordLimits,
  onTimeLimitChange,
  onCatchInitialFallTimeChange,
  onWordSearchWordLimitChange,
  onHangmanWordLengthChange,
  onLabirintoWordLengthChange,
  onPairsChange,
  onGridSizeChange,
  onQuizLimitChange,
  onSoletraWordLimitChange,
  onOpenAdminHub,
  onSelect,
}) {
  return (
    // Contêiner principal da grade de jogos
    <section className="menu-grid">
      
      {/* ITERAÇÃO SOBRE OS JOGOS DISPONÍVEIS */}
      {games.map((game) => (
        <article key={game.id} className="tile">
          <p className="eyebrow">{game.title}</p>
          <h3>{game.description}</h3>
          
          {/* CONFIGURAÇÃO GLOBAL DE TEMPO MÁXIMO (Comum a todos os jogos) */}
          <label className="time-field">
            <span>Tempo máximo (s)</span>
            <input
              type="number"
              min={30}
              max={600}
              step={10}
              value={timeLimits?.[game.id] ?? 30}
              onChange={(e) =>
                onTimeLimitChange(game.id, Number(e.target.value))
              }
            />
          </label>

          {/* CONFIGURAÇÕES ESPECÍFICAS: CESTA DE OFERTAS (catch) */}
          {game.id === "catch" && (
            <label className="time-field">
              <span>Tempo inicial da queda (s)</span>
              <input
                type="number"
                min={3}
                max={30}
                step={1}
                value={catchInitialFallTimes?.[game.id] ?? 10}
                onChange={(e) =>
                  onCatchInitialFallTimeChange(game.id, Number(e.target.value))
                }
              />
            </label>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: JOGO DA MEMÓRIA (memory) */}
          {game.id === "memory" && (
            <label className="time-field">
              <span>Pares de cartas</span>
              <select
                value={pairsLimits?.[game.id] ?? 6}
                onChange={(e) => onPairsChange(game.id, Number(e.target.value))}
              >
                {[4, 6, 8, 10, 12].map((val) => (
                  <option key={val} value={val}>
                    {val} pares
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: ACERTE O ALVO (whac) */}
          {game.id === "whac" && (
            <label className="time-field">
              <span>Tamanho da grade</span>
              <select
                value={gridSizes?.[game.id] ?? 12}
                onChange={(e) =>
                  onGridSizeChange(game.id, Number(e.target.value))
                }
              >
                {[12, 16, 20, 25].map((val) => (
                  <option key={val} value={val}>
                    {val} slots
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: CAÇA-PALAVRAS (wordsearch) */}
          {game.id === "wordsearch" && (
            <>
              <label className="time-field">
                <span>Tamanho da grade</span>
                <select
                  value={gridSizes?.[game.id] ?? 10}
                  onChange={(e) =>
                    onGridSizeChange(game.id, Number(e.target.value))
                  }
                >
                  {[5, 8, 10, 12].map((val) => (
                    <option key={val} value={val}>
                      {val} x {val}
                    </option>
                  ))}
                </select>
              </label>
              <label className="time-field">
                <span>Qtd. de palavras</span>
                <input
                  type="number"
                  min={wordSearchWordBounds?.min ?? 1}
                  max={wordSearchWordBounds?.max ?? 1}
                  step={1}
                  value={
                    wordSearchWordLimits?.[game.id] ??
                    Math.min(5, wordSearchWordBounds?.max ?? 5)
                  }
                  onChange={(e) =>
                    onWordSearchWordLimitChange(game.id, Number(e.target.value))
                  }
                  disabled={(wordSearchWordBounds?.max ?? 0) < 1}
                />
              </label>
            </>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: LABIRINTO (labirinto) */}
          {game.id === "labirinto" && (
            <>
              <label className="time-field">
                <span>Tamanho do labirinto</span>
                <select
                  value={gridSizes?.[game.id] ?? 8}
                  onChange={(e) =>
                    onGridSizeChange(game.id, Number(e.target.value))
                  }
                >
                  {[8, 10].map((val) => (
                    <option key={val} value={val}>
                      {val} x {val}
                    </option>
                  ))}
                </select>
              </label>
              <label className="time-field">
                <span>Qtd. de letras</span>
                <input
                  type="number"
                  min={3}
                  max={12}
                  step={1}
                  value={labirintoWordLengths?.[game.id] ?? 5}
                  onChange={(e) =>
                    onLabirintoWordLengthChange(game.id, Number(e.target.value))
                  }
                />
              </label>
            </>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: QUIZ (quiz) */}
          {game.id === "quiz" && (
            <label className="time-field">
              <span>Qtd. de perguntas</span>
              <input
                type="number"
                min={quizQuestionBounds?.min ?? 0}
                max={quizQuestionBounds?.max ?? 0}
                step={1}
                value={
                  quizQuestionLimits?.[game.id] ??
                  Math.min(5, quizQuestionBounds?.max ?? 5)
                }
                onChange={(e) =>
                  onQuizLimitChange(game.id, Number(e.target.value))
                }
                disabled={(quizQuestionBounds?.max ?? 0) < 1}
              />
            </label>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: SOLETRA (soletra) */}
          {game.id === "soletra" && (
            <label className="time-field">
              <span>Qtd. de palavras</span>
              <input
                type="number"
                min={soletraWordBounds?.min ?? 0}
                max={soletraWordBounds?.max ?? 0}
                step={1}
                value={
                  soletraWordLimits?.[game.id] ??
                  Math.min(3, soletraWordBounds?.max ?? 3)
                }
                onChange={(e) =>
                  onSoletraWordLimitChange(game.id, Number(e.target.value))
                }
                disabled={(soletraWordBounds?.max ?? 0) < 1}
              />
            </label>
          )}

          {/* CONFIGURAÇÕES ESPECÍFICAS: FORCA (hangman) */}
          {game.id === "hangman" && (
            <label className="time-field">
              <span>Qtd. de letras</span>
              <input
                type="number"
                min={3}
                max={12}
                step={1}
                value={hangmanWordLengths?.[game.id] ?? 5}
                onChange={(e) =>
                  onHangmanWordLengthChange(game.id, Number(e.target.value))
                }
              />
            </label>
          )}

          {/* BOTÃO DE INÍCIO DA PARTIDA */}
          <button className="primary" onClick={() => onSelect(game.id)}>
            Jogar agora
          </button>
        </article>
      ))}

      {/* CARTÃO DO PAINEL ADMINISTRATIVO (CRUD HUB) */}
      <article className="tile">
        <p className="eyebrow">Administração</p>
        <h3>Hub CRUD do Banco</h3>
        <p className="muted">
          Veja usuários, palavras, frases, perguntas, respostas e demais
          registros.
        </p>
        <button className="primary" onClick={onOpenAdminHub}>
          Abrir hub de dados
        </button>
      </article>
    </section>
  );
}
