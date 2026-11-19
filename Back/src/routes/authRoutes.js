const express = require('express');
const authController = require('../controllers/authController');

function createAuthRoutes() {
  const router = express.Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  return router;
}

module.exports = createAuthRoutes;
