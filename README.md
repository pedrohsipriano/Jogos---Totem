# Jogos Convenção - Totem

Aplicação web interativa em React + Vite projetada especificamente para totens touch físicos e totens secundários do evento.

---

## Tecnologias Utilizadas

- **Core**: React 19 + Vite 6 (com minificação e empaquetamento único via `vite-plugin-singlefile` se aplicável).
- **Mobile / Totem Nativo**: Capacitor 8 (Android).
- **Linter**: ESLint 9.
- **Servidor de Produção Estático**: Nginx integrado via Docker.

---

## Minijogos Interativos Disponíveis

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

## Contrato de Evento: Fim de Jogo (Game End)

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

## Limpeza de Logs e Otimizações

- **Otimização de Logs**: O bundle do Totem em produção está configurado no `vite.config.js` para remover automaticamente todas as chamadas de `console.log(...)` usando o esbuild.
- **Segurança**: Todas as requisições para a rota `/api/admin/...` realizadas no Totem injetam automaticamente o cabeçalho `x-admin-password` para autenticação baseada em token no backend.

---

## Comandos de Execução

### Executar em Desenvolvimento Web
```bash
npm install
npm run dev
```

### Compilar Build Web
```bash
npm run build
```
O build estático e compactado será gerado na pasta `dist/` e pronto para ser servido pelo Nginx.

### Sincronizar com o Projeto Android (Capacitor)
Sempre após instalar dependências ou gerar uma nova build, sincronize os arquivos nativos do Android:
```bash
npm run build
npx cap sync android
```
Isso gera e atualiza os arquivos nativos e scripts Gradle do Capacitor (como `cordova.variables.gradle` e os assets web em `android/app/src/main/assets/public`).

---

## Sistema de Licenças do Totem

O Totem conta com um sistema híbrido (Online e Offline) de validação e controle de licença:

### 1. Ativação Dinâmica no Primeiro Uso (Padrão)
A licença não perde dias enquanto o Totem estiver desligado ou em transporte. A contagem dos dias contratados inicia apenas na **primeira abertura do app no dispositivo**.
```bash
# Gerar licença dinâmica de 30 dias para o Totem 01:
node scripts/generate-license.js --id TV-01 --days 30

# Gerar licença para testes rápidos (ex: 5 minutos):
node scripts/generate-license.js --id TESTE-01 --minutes 5
```

### 2. Validação Híbrida de Horário
- **Online**: Se o Totem estiver conectado à internet, o horário real é validado automaticamente via serviço de tempo UTC, eliminando erros de relógio desregulado no Android.
- **Offline com Proteções**:
  - **Relógio de Fábrica**: Se o dispositivo estiver com a data resetada (ano anterior a 2025), o app bloqueia e orienta a acertar a data do sistema antes de ativar.
  - **Proteção Anti-Rollback**: Se o relógio do Totem for retrocedido para tentar estender o período de licença, o sistema detecta e bloqueia o aplicativo.

### 3. Licença com Data Fixa (Opcional)
Se for necessário determinar uma data de expiração rígida a partir do momento da emissão no computador:
```bash
node scripts/generate-license.js --id TV-01 --days 30 --fixed
```

---

## PWA
O Totem está configurado como um Progressive Web App (PWA) e pode ser instalado nativamente via navegador.