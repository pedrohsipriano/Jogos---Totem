import "./tabela.styles.css";
import { formatPhoneDisplay } from "../../utils/phone";

export function Tabela({ dados }) {
  return (
    <table className="RankingTabela">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Número</th>
          <th>Pontos</th>
        </tr>
      </thead>
      <tbody>
        {/* Aqui a mágica acontece! O map vai rodar para cada usuário na lista */}
        {dados.map((usuario) => (
          // O React exige essa propriedade 'key' única para não se perder na lista!
          <tr key={usuario.id}>
            <td className="user-name-cell">
              {usuario.avatar
                ? (() => {
                    const isUrl =
                      usuario.avatar.startsWith("http://") ||
                      usuario.avatar.startsWith("https://") ||
                      usuario.avatar.startsWith("/") ||
                      usuario.avatar.startsWith("data:");
                    return isUrl ? (
                      <img
                        src={usuario.avatar}
                        alt="Avatar"
                        className="ranking-avatar-img"
                      />
                    ) : (
                      <span className="ranking-avatar-emoji">{usuario.avatar} </span>
                    );
                  })()
                : ""}
              <span className="user-name-text">{usuario.nome}</span>
            </td>
            <td>{formatPhoneDisplay(usuario.numero)}</td>
            <td>{usuario.pontos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
