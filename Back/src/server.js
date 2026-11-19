require('dotenv').config();

const mongoose = require('mongoose');
const createApp = require('./app');

async function startServer() {
  const { MONGODB_URI, JWT_SECRET } = process.env;

  if (!MONGODB_URI || !JWT_SECRET) {
    throw new Error('Defina MONGODB_URI e JWT_SECRET no arquivo .env.');
  }

  if (MONGODB_URI.includes('<db_password>')) {
    throw new Error('Substitua <db_password> pela senha real do usuário do MongoDB no arquivo .env.');
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(`Não foi possível conectar ao MongoDB: ${error.message}`);
  }

  const app = createApp();
  const port = Number(process.env.PORT) || 3001;

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Não foi possível iniciar a API: ${error.message}`);
  process.exit(1);
});
