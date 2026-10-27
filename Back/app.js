require('dotenv').config();

const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const port = Number(process.env.PORT) || 3001;
const jwtSecret = process.env.JWT_SECRET;

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

const cipherKeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hash: { type: String, required: true, unique: true, index: true },
    step: { type: Number, required: true },
    encryptedMessage: { type: String, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const CipherKey = mongoose.model('CipherKey', cipherKeySchema);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Faça login para continuar.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

function shiftCharacter(character, step) {
  const code = character.charCodeAt(0);
  const isUppercase = code >= 65 && code <= 90;
  const isLowercase = code >= 97 && code <= 122;

  if (!isUppercase && !isLowercase) return character;

  const base = isUppercase ? 65 : 97;
  return String.fromCharCode(((code - base + step) % 26 + 26) % 26 + base);
}

function caesarCipher(message, step) {
  return [...message].map((character) => shiftCharacter(character, step)).join('');
}

app.get('/', (req, res) => {
  res.json({ message: 'API da Cifra de Cesar online' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Usuário ou email já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ username, email, password: hashedPassword });

    return res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Não foi possível concluir o cadastro.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '2h' },
    );

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: { username: user.username, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Não foi possível realizar o login.' });
  }
});

async function startServer() {
  if (!process.env.MONGODB_URI || !jwtSecret) {
    throw new Error('Defina MONGODB_URI e JWT_SECRET no arquivo .env.');
  }

  if (process.env.MONGODB_URI.includes('<db_password>')) {
    throw new Error('Substitua <db_password> pela senha real do usuário do MongoDB no arquivo .env.');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(`Não foi possível conectar ao MongoDB: ${error.message}`);
  }
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Não foi possível iniciar a API: ${error.message}`);
  process.exit(1);
});

app.post('/api/cipher/encrypt', authenticateToken, async (req, res) => {
  try {
    const { message, step } = req.body;
    const numericStep = Number(step);

    if (!message || !Number.isInteger(numericStep)) {
      return res.status(400).json({ message: 'Informe uma mensagem e um passo inteiro.' });
    }

    const encryptedMessage = caesarCipher(message, numericStep);
    let hash;
    do {
      hash = crypto.randomBytes(6).toString('hex');
    } while (await CipherKey.exists({ hash }));

    await CipherKey.create({
      userId: req.user.sub,
      hash,
      step: numericStep,
      encryptedMessage,
    });

    return res.status(201).json({ encryptedMessage, hash });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Não foi possível criptografar a mensagem.' });
  }
});

app.post('/api/cipher/decrypt', authenticateToken, async (req, res) => {
  try {
    const { encryptedMessage, hash } = req.body;
    const cipherKey = await CipherKey.findOne({ hash, userId: req.user.sub, used: false });

    if (!cipherKey) {
      return res.status(404).json({ message: 'Chave inválida, inexistente ou já utilizada.' });
    }

    if (cipherKey.encryptedMessage !== encryptedMessage) {
      return res.status(400).json({ message: 'A mensagem não corresponde à chave informada.' });
    }

    const message = caesarCipher(encryptedMessage, -cipherKey.step);
    cipherKey.used = true;
    await cipherKey.save();

    return res.json({ message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Não foi possível descriptografar a mensagem.' });
  }
});