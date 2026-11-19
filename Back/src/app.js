const cors = require('cors');
const express = require('express');

const authenticateToken = require('./middleware/authenticateToken');
const createAuthRoutes = require('./routes/authRoutes');
const createCipherRoutes = require('./routes/cipherRoutes');

function createApp() {
  const app = express();
  const authMiddleware = authenticateToken(process.env.JWT_SECRET);

  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'API da Cifra de Cesar online' });
  });

  app.use('/api/auth', createAuthRoutes());
  app.use('/api/cipher', createCipherRoutes(authMiddleware));

  return app;
}

module.exports = createApp;
