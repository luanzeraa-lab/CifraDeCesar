# Documentação do projeto Cifra de Cesar

## 1. Objetivo da aplicação

O projeto é uma aplicação web que permite:

1. Criar uma conta.
2. Entrar usando usuário e senha.
3. Sortear uma vira e três cartas de Truco.
4. Usar essas cartas para calcular o deslocamento da cifra de Cesar.
5. Criptografar uma mensagem.
6. Descriptografar a mensagem usando a mensagem cifrada e uma chave privada de uso único.

Apesar de a interface usar a palavra “criptografia”, a técnica implementada é uma cifra de Cesar. Ela é útil para demonstrar conceitos de deslocamento, autenticação e fluxo de uma aplicação cliente-servidor, mas não deve ser considerada uma proteção forte para mensagens reais.

## 2. Arquitetura geral

O projeto possui duas partes:

- **Backend:** Node.js com Express, responsável pela API, autenticação, regras da cifra e acesso ao MongoDB.
- **Frontend:** Next.js com React, responsável pelas telas de cadastro, login e operações de cifra.

O fluxo geral é:

```text
Usuário
  |
  v
Frontend Next.js (porta 3000)
  |
  | HTTP + JSON + Bearer JWT
  v
API Express (porta configurada no .env)
  |
  v
MongoDB
```

O frontend nunca calcula a cifra sozinho. Ele envia os dados para a API, e o backend calcula o passo, protege a mensagem e salva a chave no banco.

## 3. Estrutura de pastas

```text
CifraDeCesar/
├── README.md
├── DOCUMENTACAO.md
├── Back/
│   ├── app.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── controllers/
│       │   ├── authController.js
│       │   └── cipherController.js
│       ├── middleware/
│       │   └── authenticateToken.js
│       ├── models/
│       │   ├── User.js
│       │   └── CipherKey.js
│       └── routes/
│           ├── authRoutes.js
│           └── cipherRoutes.js
└── Front/
    └── my-app/
        ├── app/
        │   ├── globals.css
        │   ├── layout.js
        │   ├── page.js
        │   └── dashboard/page.js
        ├── next.config.js
        ├── package.json
        └── eslint.config.mjs
```

## 4. Backend detalhado

### 4.1 `Back/app.js`

Este é o ponto de entrada mais simples do backend. Ele executa:

```js
require('./src/server');
```

O `require` carrega `src/server.js`. A separação permite deixar o arquivo da raiz como um inicializador curto e manter a configuração do servidor dentro de `src`.

### 4.2 `Back/src/server.js`

#### `startServer()`

É uma função assíncrona que prepara e inicia a API.

1. `dotenv.config()` carrega variáveis do arquivo `.env` para `process.env`.
2. A função lê `MONGODB_URI` e `JWT_SECRET`.
3. Interrompe a inicialização se alguma dessas variáveis não existir.
4. Verifica se o texto `<db_password>` ainda está na URI, evitando uma tentativa de conexão com configuração incompleta.
5. Executa `mongoose.connect(...)` para conectar ao MongoDB. O limite de seleção do servidor é de 10 segundos.
6. Chama `createApp()` para montar o Express.
7. Usa `PORT` do ambiente ou `3001` como valor padrão.
8. Executa `app.listen` e informa no console a porta usada.

O `.catch` no final captura falhas de configuração ou conexão, imprime o motivo e encerra o processo com código `1`.

### 4.3 `Back/src/app.js`

#### `createApp()`

Cria e configura uma instância do Express.

- `express()` cria a aplicação.
- `authenticateToken(process.env.JWT_SECRET)` cria uma versão do middleware de autenticação usando o segredo JWT atual.
- `cors(...)` permite chamadas vindas do endereço definido em `FRONTEND_URL`; se não houver configuração, usa `http://localhost:3000`.
- `express.json()` permite que a API leia corpos de requisição no formato JSON.
- `GET /` funciona como uma verificação simples de disponibilidade e retorna `API da Cifra de Cesar online`.
- `app.use('/api/auth', createAuthRoutes())` registra cadastro e login.
- `app.use('/api/cipher', createCipherRoutes(authMiddleware))` registra as operações protegidas.

A função retorna o app, mas não abre a porta. Isso é responsabilidade de `startServer()`.

### 4.4 `Back/src/middleware/authenticateToken.js`

#### `authenticateToken(jwtSecret)`

É uma função fábrica: recebe o segredo JWT e devolve outra função que será usada pelo Express como middleware.

#### Middleware retornado

1. Lê o cabeçalho `Authorization`.
2. Aceita apenas o formato `Bearer token`.
3. Retira a palavra `Bearer ` usando `slice(7)`.
4. Retorna HTTP `401` se o token não existir.
5. Executa `jwt.verify(token, jwtSecret)` para validar assinatura e validade.
6. Guarda os dados do token em `req.user`.
7. Chama `next()` para liberar a requisição.
8. Se a verificação falhar, retorna HTTP `401` com sessão inválida ou expirada.

O campo `req.user.sub` é o identificador do usuário e é usado depois para garantir que cada pessoa só acesse suas próprias chaves.

### 4.5 `Back/src/models/User.js`

#### `userSchema`

Define como usuários são armazenados no MongoDB:

- `username`: texto obrigatório, único e sem espaços extras nas extremidades.
- `email`: texto obrigatório, único, convertido para minúsculas e sem espaços extras.
- `password`: texto obrigatório. O controller salva aqui o hash da senha, não a senha original.
- `timestamps: true`: o Mongoose cria `createdAt` e `updatedAt`.

#### `mongoose.model('User', userSchema)`

Transforma o schema em um model que permite consultar e criar documentos na coleção de usuários.

### 4.6 `Back/src/models/CipherKey.js`

#### `cipherKeySchema`

Representa uma chave criada durante uma criptografia:

- `userId`: identifica o dono da chave e referencia o model `User`.
- `hash`: identificador aleatório da chave, obrigatório, indexado e único.
- `step`: passo numérico usado na cifra de Cesar.
- `encryptedMessage`: mensagem resultante da cifra.
- `used`: indica se a chave já foi consumida; começa como `false`.
- `timestamps: true`: registra criação e atualização.

A chave não guarda a mensagem original. Ela guarda a mensagem cifrada e o passo necessário para desfazê-la.

### 4.7 `Back/src/controllers/authController.js`

#### `register(req, res)`

Controla o cadastro.

1. Extrai `username`, `email` e `password` de `req.body`.
2. Retorna `400` se algum campo estiver vazio.
3. Exige pelo menos seis caracteres na senha.
4. Procura usuário existente pelo nome **ou** pelo email.
5. Retorna `409` se já houver conflito.
6. Usa `bcrypt.hash(password, 12)` para gerar o hash da senha. O número `12` é o custo do bcrypt.
7. Cria o usuário no MongoDB.
8. Retorna `201` com mensagem de sucesso.

Falhas inesperadas são registradas no servidor e retornam `500`, sem expor detalhes internos ao cliente.

#### `login(req, res)`

Controla a autenticação.

1. Extrai `username` e `password`.
2. Procura o usuário pelo nome.
3. Usa `bcrypt.compare` para comparar a senha informada com o hash salvo.
4. Retorna `401` quando o usuário não existe ou a senha está errada. A mesma mensagem para os dois casos evita revelar qual informação falhou.
5. Cria um JWT com `sub` igual ao id do usuário e `username` igual ao nome da conta.
6. Configura validade de duas horas com `expiresIn: '2h'`.
7. Retorna o token e dados básicos do usuário.

O frontend envia também um campo `email` no formulário de login, mas o backend atual não o utiliza: o login é feito exclusivamente por `username` e `password`.

### 4.8 `Back/src/routes/authRoutes.js`

#### `createAuthRoutes()`

Cria um `Router` do Express e liga:

- `POST /register` ao controller `register`.
- `POST /login` ao controller `login`.

O prefixo `/api/auth` é adicionado em `src/app.js`, então as URLs completas são `/api/auth/register` e `/api/auth/login`.

### 4.9 `Back/src/routes/cipherRoutes.js`

#### `createCipherRoutes(authenticateToken)`

Cria o router de cifras e recebe o middleware pronto como parâmetro.

`router.use(authenticateToken)` aplica a autenticação a todas as rotas abaixo. Isso significa que nenhuma operação de Truco, criptografia ou descriptografia funciona sem JWT válido.

Rotas registradas:

- `GET /truco` chama `drawTruco`.
- `POST /encrypt` chama `encrypt`.
- `POST /decrypt` chama `decrypt`.

Com o prefixo `/api/cipher`, as URLs completas são `/api/cipher/truco`, `/api/cipher/encrypt` e `/api/cipher/decrypt`.

## 5. Regra da cifra e do Truco

### 5.1 Constantes do `cipherController.js`

- `SUITS`: naipes possíveis: `OUROS`, `ESPADAS`, `COPAS` e `PAUS`.
- `CARD_VALUES`: ordem dos valores do baralho usado no projeto: `4, 5, 6, 7, Q, J, K, A, 2, 3`.
- `BASE_VALUES`: pontuação base de cada valor.
- `SUIT_BONUS`: bônus normal de cada naipe.
- `MANILHA_BONUS`: bônus especial para o naipe da manilha.

O baralho tem 10 valores e 4 naipes, portanto possui 40 cartas.

### 5.2 `shiftCharacter(character, step)`

Desloca uma única letra.

1. Obtém o código Unicode/ASCII com `charCodeAt(0)`.
2. Verifica se o caractere é uma letra maiúscula (`A-Z`) ou minúscula (`a-z`).
3. Retorna o caractere sem alteração quando ele não é letra. Assim, espaços, números, pontuação e acentos fora de `A-Z` são preservados.
4. Define `65` como base para maiúsculas ou `97` para minúsculas.
5. Aplica o deslocamento com módulo `26`, fazendo a letra voltar ao início do alfabeto quando passa de `Z`.
6. O termo `+ 26` antes do segundo módulo também permite passos negativos, usados na descriptografia.

Exemplo: com passo `3`, `A` vira `D`, `x` vira `a` e `!` permanece `!`.

### 5.3 `caesarCipher(message, step)`

Aplica `shiftCharacter` a cada caractere da mensagem.

- `[...message]` transforma a string em uma lista de caracteres.
- `.map(...)` calcula o novo caractere para cada posição.
- `.join('')` reúne os caracteres em uma nova mensagem.

Usar um passo positivo cifra a mensagem. Usar o mesmo passo negativo desfaz a transformação.

### 5.4 `isValidCard(card)`

Verifica se existe uma carta e se:

- `card.valor` está em `CARD_VALUES`.
- `card.naipe` está em `SUITS`.

Retorna um valor verdadeiro ou falso. Ela não verifica repetição; essa responsabilidade fica em `calculateTrucoStep`.

### 5.5 `drawTrucoHand()`

Monta e embaralha uma mão.

1. `flatMap` combina cada valor com cada naipe e cria as 40 cartas.
2. O `for` percorre o baralho do fim para o começo.
3. A cada posição, `Math.random()` escolhe outra posição.
4. A troca entre duas posições implementa o embaralhamento de Fisher-Yates.
5. `deck.pop()` retira uma carta para ser a vira.
6. Mais três chamadas a `pop()` retiram a mão.
7. Retorna o valor e o naipe da vira, além das três cartas.

Como as cartas são retiradas do mesmo baralho, a vira e as três cartas não se repetem.

### 5.6 `calculateTrucoStep(hand, vira)`

Calcula o passo usado na cifra.

1. Encontra a posição da vira em `CARD_VALUES`.
2. Rejeita a vira se ela não existir.
3. Exige uma lista com exatamente três cartas válidas.
4. Cria um `Set` com `valor-naipe` para impedir cartas repetidas.
5. Define como manilha o próximo valor depois da vira. O operador `%` faz o último valor voltar ao primeiro.
6. Percorre as três cartas com `reduce`.
7. Para cada carta, soma o valor base e o bônus do naipe.
8. Se a carta for manilha, usa `MANILHA_BONUS`; caso contrário, usa `SUIT_BONUS`.
9. Retorna a soma final.

Exemplo didático: se a vira for `7`, o próximo valor na lista é `Q`, então `Q` é a manilha. Uma carta `Q` de `PAUS` recebe valor base `8` mais bônus de manilha `10`, totalizando `18` antes das outras cartas.

### 5.7 `getTrucoHand()`

Chama `drawTrucoHand`, calcula o passo com `calculateTrucoStep` e devolve tudo em um único objeto:

```json
{
  "vira": "7",
  "viraNaipe": "COPAS",
  "mao": [
    { "valor": "Q", "naipe": "PAUS" },
    { "valor": "4", "naipe": "OUROS" },
    { "valor": "A", "naipe": "ESPADAS" }
  ],
  "step": 27
}
```

O valor exato varia a cada sorteio.

### 5.8 `saveCipherKey(userId, step, encryptedMessage, selectedCards)`

Cria e salva uma chave privada.

1. Monta o prefixo do hash com o valor e a inicial do naipe de cada uma das 3 cartas, por exemplo `AP10O` ou `QCPAE`.
2. Gera seis bytes aleatórios com `crypto.randomBytes(6)` e transforma-os em uma parte alfanumérica.
3. Consulta `CipherKey.exists` para conferir se o hash completo já está em uso.
4. Repete a geração enquanto houver colisão.
5. Salva usuário, hash, passo, mensagem cifrada e cartas selecionadas no MongoDB.
6. Retorna o documento criado.

O nome `hash` é usado no código como identificador, mas ele não é um hash da mensagem. É um token aleatório usado para localizar a chave.

### 5.9 `drawTruco(req, res)`

É o controller do endpoint `GET /api/cipher/truco`. Ele chama `getTrucoHand()` e envia o resultado com `res.json`.

O objeto `req` não é utilizado, mas aparece porque controllers do Express normalmente recebem requisição e resposta.

### 5.10 `encrypt(req, res)`

Controla a criptografia.

1. Lê `message`, `mao` e `vira` do corpo JSON.
2. Retorna `400` se não houver mensagem.
3. Usa a mão enviada pelo frontend quando ela possui três cartas e uma vira; caso contrário, sorteia uma nova mão.
4. Calcula o passo.
5. Aplica a cifra de Cesar.
6. Salva a chave associada ao usuário autenticado (`req.user.sub`).
7. Retorna `201` com mensagem cifrada, identificador, passo, vira e mão.

Erros de vira inválida, mão incorreta ou cartas repetidas retornam `400`. Outros erros são registrados no servidor e retornam `500`.

### 5.11 `decrypt(req, res)`

Controla a descriptografia.

1. Lê `encryptedMessage` e `hash`.
2. Busca no banco uma chave com esse identificador, pertencente ao usuário autenticado e ainda não usada.
3. Retorna `404` se a chave não existir, for de outra pessoa ou já tiver sido usada.
4. Confere se a mensagem enviada é exatamente a mensagem cifrada salva na chave.
5. Aplica `caesarCipher` com o passo negativo.
6. Marca `used` como `true` e salva a alteração.
7. Retorna a mensagem original.

Essa ordem impede que uma chave seja usada com outra mensagem e implementa o uso único.

## 6. Frontend detalhado

### 6.1 `Front/my-app/app/layout.js`

#### `RootLayout({ children })`

É o layout raiz do Next.js.

- Importa as fontes Geist e Geist Mono com `next/font/google`.
- Importa o CSS global.
- Define metadados de título e descrição.
- Cria a estrutura HTML com idioma `pt-BR`.
- Aplica as variáveis das fontes no elemento `html`.
- Renderiza `children`, que é a página atualmente acessada.

### 6.2 `Front/my-app/app/page.js`

Essa página é um Client Component porque usa estado, eventos, `localStorage` e navegação do navegador.

#### `Home()`

Renderiza a tela de autenticação e mantém estes estados:

- `isRegistering`: alterna entre cadastro e login.
- `username`, `email` e `password`: valores dos inputs.
- `message`: aviso de sucesso ou erro.
- `isLoading`: impede o envio repetido enquanto a API responde.

`API_URL` usa `NEXT_PUBLIC_API_URL` ou `http://localhost:3002` como padrão.

#### `changeMode()`

Troca entre login e cadastro, limpa avisos e apaga email e senha para evitar reaproveitar dados do formulário anterior.

#### `handleSubmit(event)`

Executa quando o formulário é enviado.

1. Cancela o comportamento padrão de recarregar a página.
2. Limpa a mensagem e liga o estado de carregamento.
3. Escolhe `/api/auth/register` ou `/api/auth/login` conforme o modo.
4. Envia os campos como JSON usando `fetch`.
5. Converte a resposta para JSON.
6. Transforma respostas HTTP não bem-sucedidas em erro exibível.
7. Salva o JWT em `localStorage` quando ele existe.
8. No login, navega para `/dashboard`.
9. No cadastro, mostra sucesso e volta para o modo de login.
10. O bloco `finally` desliga o carregamento mesmo quando ocorre erro.

O JSX da função exibe o painel visual da marca, o formulário condicional e o botão para alternar entre os modos.

### 6.3 `Front/my-app/app/dashboard/page.js`

Também é um Client Component. Ele exige um JWT antes de permitir as operações.

#### `Dashboard()`

Mantém estados para:

- Tela ativa: criptografia ou descriptografia.
- Mensagem original e mensagem cifrada.
- Chave privada.
- Resultado exibido.
- Avisos e carregamento.
- Mão sorteada e estado do sorteio.

O mapa `SUIT_SYMBOLS` converte nomes dos naipes em símbolos visuais.

#### `useEffect(...)`

Executado quando a página é carregada. Se não existir `cifra-token` no `localStorage`, redireciona para `/`. Isso melhora o fluxo da interface, mas a proteção real continua sendo o middleware do backend.

#### `selectScreen(screen)`

Troca a aba ativa, limpa resultado e aviso e remove a mão exibida. Assim, a tela começa limpa ao alternar entre operações.

#### `drawTrucoHand()`

1. Liga o estado `drawing`.
2. Faz `GET /api/cipher/truco` com o JWT.
3. Lê e valida a resposta.
4. Salva a mão em `trucoHand` para renderização.
5. Se a sessão estiver inválida, remove o token e volta ao login.
6. Mostra outros erros no aviso.
7. Desliga `drawing` no `finally`.

#### `submit(event)`

É o envio principal do dashboard.

1. Impede recarregamento, liga `loading` e limpa mensagens anteriores.
2. Decide se está criptografando pela aba ativa.
3. Para criptografar, envia `message`, `mao` e `vira`; para descriptografar, envia `encryptedMessage` e `hash`.
4. Faz `POST` para o endpoint correto com JSON e Bearer JWT.
5. Exibe a mensagem cifrada e a chave quando cifra.
6. Exibe a mensagem original quando decifra.
7. Remove o token e redireciona se a API informar sessão inválida.
8. Garante o desligamento do carregamento no `finally`.

#### `logout()`

Remove o JWT do `localStorage` e navega para a tela inicial. Como não existe sessão no servidor para invalidar, o logout é feito localmente.

#### `renderCard(card, extraClass = '')`

É uma função auxiliar de renderização. Ela:

- Decide se a carta recebe classe vermelha ou preta.
- Usa o valor e o símbolo do naipe no canto.
- Mostra o símbolo central.
- Mostra o nome do naipe, exceto quando uma classe adicional define a carta como vira.
- Cria uma `key` com valor e naipe para o React identificar o elemento.

O retorno é JSX, não uma string HTML.

#### JSX do dashboard

A estrutura visual tem:

- Cabeçalho com nome do projeto e botão sair.
- Navegação entre criptografar e descriptografar.
- Formulário adaptado à operação atual.
- Área de cartas sorteadas quando existe `trucoHand`.
- Caixa de resultado e avisos de status.

## 7. CSS e configuração do frontend

### `globals.css`

O arquivo concentra o estilo global:

- `:root` define cores e variáveis reutilizáveis.
- `@theme inline` integra variáveis com o Tailwind.
- `.auth-shell` cria o layout dividido de login/cadastro.
- `.brand-panel` estiliza o painel da marca e a decoração circular.
- `.form-panel`, `input`, `textarea` e botões formam o fluxo de autenticação e operação.
- `.workspace-shell`, `.workspace-header` e `.workspace-nav` organizam o dashboard.
- `.playing-card` e classes relacionadas desenham as cartas.
- `.result-box` destaca o resultado e a chave privada.
- O `@media (max-width: 760px)` adapta a interface para telas pequenas.

O CSS não contém regras de negócio; ele somente define aparência, espaçamento, responsividade, foco e estados visuais.

### `next.config.js`

Configura o Next.js:

- `agentFeedback: true` habilita a configuração experimental indicada pelo projeto.
- `cacheComponents: true` e `partialPrefetching: true` habilitam recursos de cache e pré-carregamento parcial.
- A configuração `turbopack` indica o loader do Tailwind para arquivos CSS.

### `eslint.config.mjs`

Carrega as regras de qualidade `eslint-config-next/core-web-vitals` e ignora pastas geradas como `.next`, `out` e `build`.

### `package.json`

No frontend, os scripts principais são:

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run build`: gera a versão de produção.
- `npm start`: inicia a versão de produção.
- `npm run lint`: executa o ESLint.

No backend:

- `npm start`: executa `node app.js`.
- O script de teste atual é apenas um placeholder e sempre termina informando que não há testes configurados.

## 8. API para apresentar

### `GET /`

Verifica se a API está online.

Resposta esperada:

```json
{ "message": "API da Cifra de Cesar online" }
```

### `POST /api/auth/register`

Corpo:

```json
{
  "username": "ana",
  "email": "ana@email.com",
  "password": "senha123"
}
```

Respostas importantes: `201` em sucesso, `400` para campos inválidos e `409` para usuário ou email já cadastrados.

### `POST /api/auth/login`

Corpo:

```json
{
  "username": "ana",
  "password": "senha123"
}
```

Retorna o JWT. As rotas protegidas devem receber:

```text
Authorization: Bearer SEU_TOKEN
```

### `GET /api/cipher/truco`

Exige JWT e retorna vira, três cartas e passo calculado.

### `POST /api/cipher/encrypt`

Exige JWT. Corpo mínimo:

```json
{ "message": "Ola mundo" }
```

Também aceita `mao` e `vira` para usar cartas previamente sorteadas.

### `POST /api/cipher/decrypt`

Exige JWT e recebe:

```json
{
  "encryptedMessage": "R od...",
  "hash": "4a9f20c1b8de"
}
```

A chave precisa pertencer ao usuário, estar ligada àquela mensagem e ainda não ter sido usada.

## 9. Configuração e execução

### Backend

Dentro de `Back`:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

O `.env` precisa conter:

```env
PORT=3002
JWT_SECRET=uma-chave-secreta-longa
FRONTEND_URL=http://localhost:3000
MONGODB_URI=sua-uri-do-mongodb
```

### Frontend

Dentro de `Front/my-app`:

```powershell
npm install
npm run dev
```

O frontend usa `NEXT_PUBLIC_API_URL` quando essa variável existe. Caso contrário, o código usa `http://localhost:3002`.

### Atenção às portas

O valor padrão de `src/server.js` é `3001`, mas o README, o `.env.example` e o fallback do frontend usam `3002`. Para evitar erro de conexão, defina explicitamente `PORT=3002` no `.env` do backend, ou altere o endereço usado pelo frontend para coincidir com a porta escolhida.

O `FRONTEND_URL` deve apontar para a porta real do Next.js, normalmente `http://localhost:3000`.

## 10. Fluxo completo de uma criptografia

1. O usuário faz login.
2. O backend valida a senha com bcrypt e entrega um JWT válido por duas horas.
3. O frontend salva esse JWT no navegador.
4. O usuário abre o dashboard e solicita uma mão.
5. O backend valida o JWT, embaralha 40 cartas e devolve uma vira e três cartas.
6. O backend calcula a manilha, os valores base, os bônus e o passo.
7. O usuário informa uma mensagem e envia a operação.
8. O backend aplica o passo às letras.
9. O backend gera um identificador aleatório e salva a chave no MongoDB.
10. O frontend mostra a mensagem cifrada e a chave privada.

## 11. Fluxo completo de uma descriptografia

1. O usuário cola a mensagem cifrada e informa a chave privada.
2. O frontend envia os dois dados com o JWT.
3. O backend procura uma chave do usuário que ainda não foi usada.
4. Confere se a mensagem recebida é a mesma salva na chave.
5. Aplica o passo negativo.
6. Marca a chave como usada.
7. Retorna a mensagem original.

Uma segunda tentativa com a mesma chave falha porque a busca exige `used: false`.

## 12. Pontos de segurança e limitações

- Senhas não são armazenadas em texto puro; são protegidas com bcrypt.
- Rotas de cifra exigem JWT.
- Cada chave é vinculada ao usuário autenticado.
- A chave é de uso único.
- A comparação da mensagem evita usar uma chave com conteúdo diferente.
- A cifra de Cesar é reversível e possui apenas 26 possibilidades de deslocamento; não é indicada para segurança real.
- O JWT é salvo em `localStorage`, o que é simples para o projeto, mas pode ser acessado por scripts executados no contexto da página em caso de XSS.
- Não há testes automatizados configurados no backend.
- A geração de mão usa `Math.random()`, apropriado para sorteio visual, mas não para um sistema que exigisse aleatoriedade criptograficamente segura.
- A validação de email é principalmente a do campo HTML e da configuração do banco; o backend não implementa uma validação de formato específica.

## 13. Roteiro curto para apresentação

1. Explique que o frontend é Next.js e o backend é Express.
2. Mostre o cadastro e explique o hash bcrypt.
3. Faça login e destaque que o token JWT é usado nas próximas requisições.
4. No dashboard, sorteie as cartas e explique vira, manilha e passo.
5. Criptografe uma mensagem e mostre a chave privada gerada.
6. Descriptografe usando a mensagem e a chave.
7. Tente reutilizar a mesma chave para demonstrar o bloqueio de uso único.
8. Finalize explicando que a cifra é didática, enquanto autenticação, persistência e autorização demonstram a integração de uma aplicação completa.
