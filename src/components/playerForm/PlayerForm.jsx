import "./playerForm.style.css";

/**
 * COMPONENTE DE FORMULÁRIO DE IDENTIFICAÇÃO DO JOGADOR (PlayerForm.jsx)
 * Responsável por capturar o número de telefone e o nome do usuário antes de liberar o acesso aos minijogos.
 * Realiza a verificação condicional de cadastros existentes: se o telefone já for conhecido (`isKnownPhone`),
 * oculta o campo de nome e exibe uma mensagem de boas-vindas personalizada.
 *
 * @param {Object} props - Propriedades recebidas do componente orquestrador (App).
 * @param {string} props.name - Nome atual do jogador (em rascunho ou vindo do banco de dados).
 * @param {string} props.phone - Número de telefone atual informado no input.
 * @param {Function} props.onNameChange - Callback disparada ao digitar no campo de nome.
 * @param {Function} props.onPhoneChange - Callback disparada ao digitar no campo de telefone.
 * @param {boolean} props.canPlay - Flag indicando se os dados informados são válidos para liberar os jogos.
 * @param {boolean} props.isKnownPhone - Flag indicando se o telefone informado já consta no banco de dados.
 */
export default function PlayerForm({
  name,
  phone,
  onNameChange,
  onPhoneChange,
  canPlay,
  isKnownPhone = false,
}) {
  return (
    // Contêiner em formato de painel para o formulário de identificação
    <section className="panel">
      
      {/* CABEÇALHO DO PAINEL DE IDENTIFICAÇÃO */}
      <div className="panel-head">
        <div>
          <p className="eyebrow">Identificação</p>
          <h2>Informe seu celular</h2>
        </div>
      </div>

      {/* GRADE DO FORMULÁRIO: Alinha os inputs de telefone e nome lado a lado ou em coluna */}
      <div className="form-grid">
        
        {/* CAMPO DE TELEFONE (Sempre visível) */}
        <label className="field">
          <span>Telefone</span>
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(DDD) 99999-9999"
          />
        </label>

        {/* CAMPO DE NOME (Exibido apenas se o telefone ainda não estiver cadastrado no banco) */}
        {!isKnownPhone && (
          <label className="field">
            <span>Nome</span>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Seu nome"
            />
          </label>
        )}
      </div>

      {/* MENSAGEM DE BOAS-VINDAS PARA JOGADOR RECORRENTE */}
      {isKnownPhone && (
        <p className="muted">
          Cadastro encontrado. Bem-vindo de volta, {name}.
        </p>
      )}

      {/* AVISO DE PENDÊNCIA DE PREENCHIMENTO */}
      {!canPlay && <p className="muted">Preencha para liberar os jogos.</p>}
    </section>
  );
}
