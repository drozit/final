const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Токен не предоставлен' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, decoded) => {
    if (err) {
      console.log('Ошибка верификации токена:', err);
      return res.status(403).json({ message: 'Неверный токен' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = { verifyToken };
