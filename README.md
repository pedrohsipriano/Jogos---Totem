# Jogos Convenção - Totem

Aplicação web interativa em React + Vite projetada especificamente para totens touch físicos e totens secundários do evento.

---

## 🛠️ Tecnologias Utilizadas

- **Core**: React 19 + Vite 6 (com minificação e empaquetamento único via `vite-plugin-singlefile` se aplicável).
- **Linter**: ESLint 9.
- **Servidor de Produção Estático**: Nginx integrado via Docker.

---

## 🎮 Minijogos Interativos Disponíveis

Todos os jogos foram desenvolvidos em CSS nativo e JS, adaptados para telas de toque:
- **Omni-Catch**: Jogo dinâmico neon 3x3 no estilo Whac-A-Mole.
- **Jogo da Memória**: Cartas temáticas com ícones modernos.
- **Caça-palavras**: Grade interativa para encontrar termos do ecossistema.
- **Forca**: Jogo clássico com teclado virtual adaptado para totens.
- **Quiz**: Perguntas com tempo regressivo.
- **Labirinto**: Grade interativa de palavras e dicas.
- **Soletra**: Digitação e soletração interativa.
- **Cesta de Ofertas** e **Aperte o Passo**: Jogos de agilidade adicionais.

---

## 📝 Contrato de Evento: Fim de Jogo (Game End)

Todos os minijogos chamam um diálogo global e disparam um payload de pontuação padronizado para a API atualizar a pontuação geral do participante.

### Estrutura do Payload
```json
{
  "game": "string",            // Nome amigável do jogo (ex: "Forca")
  "score": 85,                 // Percentual/Pontuação da rodada (0 a 100)
  "remainingSeconds": 15,      // Segundos restantes no cronômetro
  "timedOut": false            // True se o jogador perdeu por tempo
}
```

### Código de Integração Recomendado
```javascript
import sanitizeGamePayload from "../../Dialog/sanitizeGamePayload";

const payload = { 
    game: 'Forca', 
    score: points, 
    remainingSeconds: seconds, 
    timedOut 
};
const finalPayload = sanitizeGamePayload(payload);

onScore?.(finalPayload);
onGameOver?.(finalPayload);

// Dispara popup global de pontuação e envia dados à API
import("../Dialog/gameEndReporter").then(m => m.reportGameEnd && m.reportGameEnd(finalPayload));
```

---

## 🚀 Limpeza de Logs e Otimizações

- **Otimização de Logs**: O bundle do Totem em produção está configurado no `vite.config.js` para remover automaticamente todas as chamadas de `console.log(...)` usando o esbuild.
- **Segurança**: Todas as requisições para a rota `/api/admin/...` realizadas no Totem injetam automaticamente o cabeçalho `x-admin-password` para autenticação baseada em token no backend.

---

## 💻 Comandos de Execução

Execute na pasta `/JogosConvecao - Totem`:

### Executar em Desenvolvimento
```bash
npm install
npm run dev
```

### Compilar Build de Produção
```bash
npm run build
```
O build estático e compactado será gerado na pasta `dist/` e pronto para ser servido pelo Nginx.


## PWA
O Totem está configurado como um Progressive Web App (PWA) e pode ser instalado nativamente via navegador.