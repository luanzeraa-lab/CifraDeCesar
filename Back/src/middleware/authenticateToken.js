const jwt = require('jsonwebtoken');

function authenticateToken(jwtSecret) {
  return (req, res, next) => {
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
  };
}

module.exports = authenticateToken;
