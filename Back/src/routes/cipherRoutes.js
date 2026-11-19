const express = require('express');
const cipherController = require('../controllers/cipherController');

function createCipherRoutes(authenticateToken) {
  const router = express.Router();

  router.use(authenticateToken);
  router.post('/encrypt', cipherController.encrypt);
  router.post('/criptografar', cipherController.encrypt);
  router.post('/decrypt', cipherController.decrypt);

  return router;
}

module.exports = createCipherRoutes;
