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

O usuário pode criar uma conta, fazer login, criptografar mensagens com a cifra de César e descriptografá-las usando a chave privada de uso único.