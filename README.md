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

## Controle de Acesso e Senha do Operador

- **Acesso Inicial Livre**: Por padrão, o Totem não exige senha inicial para inicialização ou testes, entrando diretamente no menu de jogos.
- **Configuração Posterior**: O operador pode cadastrar, alterar ou remover uma senha a qualquer momento acessando o painel administrativo (`AdminHub`) na aba **Segurança**.
- **Comportamento com Senha**: Quando uma senha é cadastrada, as ações de saída, acesso a configurações no `GameNav` e a inicialização passam a exigir a credencial configurada. Se removida, o acesso volta a ser livre.

---

## Identidade Visual e Tema Padrão

- O aplicativo opera por padrão com tema minimalista **Preto e Branco puro**, com fundo `#000000`, superfícies em tons neutros escuros (`#111111`) e destaques em branco (`#ffffff`), garantindo alto contraste e elegância em telas de alta resolução.
- **Painel de Personalização em Abas** (no `AdminHub`):
  - **Aba Logotipo**: 
    - Por padrão, o Totem opera sem nenhum logotipo fixo (a marca original foi removida).
    - Permite o upload de logotipo personalizado (PNG transparente, SVG, JPG, WebP) com **limite máximo de 2 MB**.
    - Slider de ajuste de tamanho visual em tempo real (40px a 160px de altura).
    - Opção de remover a logo a qualquer momento, mantendo o topo limpo.
  - **Aba Cards, Botões e Ranking**:
    - *Cards de Jogos*: Fundo, borda, título e cores do botão "Começar a jogar".
    - *Botão Principal "Começar o desafio"*: Cores de fundo e do texto para o botão de início de jogo.
    - *Card do Ranking Total*: Cor de fundo e borda do contêiner do ranking.
    - *Previews ao Vivo*: Visualização em tempo real de cada componente estilizado.
  - **Aba Teclado Virtual**:
    - *Fundo e Borda do Teclado*: Cores da caixa flutuante do teclado virtual.
    - *Números e Teclas*: Cor dos dígitos e letras.
    - *Destaque de Foco*: Cor de realce do campo focado ("Digitando em: ...").
    - *Ações (Limpar / Apagar)*: Cores dos botões "Limpar" e "←".
    - *Preview Interativo ao Vivo*: Simulação gráfica em tempo real do teclado com as cores aplicadas.
  - **Aba Fim de Jogo (Vitória/Derrota)**:
    - *Fundo e Borda da Janela*: Cores da moldura e vidro do modal de resultado.
    - *Título ("Voce venceu!")*: Cor do cabeçalho de vitória.
    - *Caixas de Pontuação e Tempo*: Cor de fundo e texto das tags de resultado.
    - *Botão "Voltar ao Cadastro"*: Cores de fundo e texto do botão principal de encerramento da partida.
    - *Preview Interativo ao Vivo*: Visualização em tempo real da tela final de jogo.
  - **Aba Plano de Fundo**:
    - *Cor Sólida*: Seleção livre via paleta ou seletor hexadecimal.
    - *Gradiente*: Definição de cor inicial, cor final e controle de direção angular.
    - *Imagem de Fundo*: Upload de imagem com **limite máximo de 5 MB** (dimensão recomendada: 1080x1920 Full HD vertical).
  - **Aba Cores Principais**:
    - *Cor 1*: Destaques principais, botões selecionados e ações.
    - *Cor 2*: Efeitos hover e bordas ativas.
    - *Cor 3*: Bordas de cards, títulos e linhas divisórias.
  - **Aba Tipografia**: Escolha da família tipográfica e tamanho base da fonte.
- **Regras e Tempo Padrão dos Jogos**:
  - Todos os jogos do sistema foram unificados para operar no **tempo padrão de 30 segundos**, tanto nas tabelas do IndexedDB quanto nos fallbacks de execução de cada partida.
  - O operador pode ajustar o tempo individualmente no painel administrativo conforme a necessidade.
- **Jogo da Memória no Painel Administrativo e Partida**:
  - *Grade de 4 Colunas Fixas*: O tabuleiro do jogo foi padronizado para exibir estritamente 4 cartas por linha (`repeat(4, 173px)`), expandindo automaticamente o número de linhas conforme a quantidade de pares da partida.
  - *Novos Ícones Padrão Universais*: Os ícones antigos da convenção anterior foram substituídos por 6 novos ícones vetoriais universais em SVG de alta qualidade (Gamepad, Troféu, Diamante, Foguete, Estrela e Alvo de Precisão), reduzindo o peso do bundle e otimizando a performance do totem.
  - *Novo Verso Padrão Sofisticado*: O verso das cartas agora utiliza uma estampa geométrica moderna com relevo minimalista (`card-back-default.svg`), substituindo o olho antigo.
  - *Aba Fotos das Cartas (Frente)*: Gestão das imagens e pares de cartas individuais.
  - *Aba Parte de Trás das Fotos (Verso)*: Permite o upload de estampa personalizada para o verso das cartas (limite de 3 MB) com visualizador ao vivo e botão de restauração do verso padrão original.
- **Identificação do Desenvolvedor e Suporte da Licença**:
  - *Cabeçalho e Rodapé Globais*: Fixados rigorosamente de ponta a ponta (`top: 0` e `bottom: 0`), colados nas bordas superior e inferior da tela sem margem (`margin: 0`) nem cantos arredondados (`border-radius: 0`), com o texto padronizado `desenvolvido por ps.system - contato.pssystem@gmail.com`.
  - *Suporte e Renovação de Licença*: Na tela de bloqueio por licença expirada ou inválida, o contato oficial para suporte e renovação foi atualizado para `contato.pssystem@gmail.com`.

---

## PWA
O Totem está configurado como um Progressive Web App (PWA) e pode ser instalado nativamente via navegador.