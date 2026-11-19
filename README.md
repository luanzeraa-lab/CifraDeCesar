# Cifra de Cesar

Aplicação com frontend em Next.js e API em Express, usando MongoDB, JWT e bcrypt.

## Configuração

### Backend

```powershell
cd Back
npm install
Copy-Item .env.example .env
```

Edite `Back/.env` e informe a URI real do MongoDB e uma chave JWT longa e secreta.

```powershell
npm start
```

A API ficará disponível em `http://localhost:3002`.

### Frontend

```powershell
cd Front/my-app
npm install
Copy-Item .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Mecânica de criptografia

Na tela de criptografar, o usuário escolhe exatamente 3 cartas de um baralho tradicional de 52 cartas.

- Paus e Copas têm valores positivos.
- Espadas e Ouros têm valores negativos.
- As cartas A, J, Q e K valem 1, 11, 12 e 13.
- A soma das três cartas define o passo da Cifra de César.
- A criptografia é bloqueada quando menos de 3 cartas são escolhidas ou quando o passo resulta em zero.

O backend recebe as cartas em `cartas` pela rota `POST /api/cipher/criptografar` (ou pelo alias `POST /api/cipher/encrypt`) e recalcula o passo no servidor.

O usuário pode criar uma conta, fazer login, criptografar mensagens com a cifra de César e descriptografá-las usando a chave privada de uso único.