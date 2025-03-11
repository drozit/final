const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Введите логин и пароль' });
  }

  db.query('SELECT id, username, email, role_id, department_id, password FROM users WHERE username = ?', 
    [username], (err, results) => {
      if (err) return res.status(500).json({ message: 'Ошибка сервера' });

      if (results.length === 0) return res.status(401).json({ message: 'Пользователь не найден' });

      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!isMatch) return res.status(401).json({ message: 'Неверный пароль' });
    
        const token = jwt.sign({ id: user.id,  email: user.email, role: user.role_id }, 'secret-key', { expiresIn: '1h' });
    
        // Сохраняем данные пользователя в сессии
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            department_id: user.department_id
          };
          console.log('Данные пользователя в сессии:', req.session.user); // Для отладки

        res.json({
            token,
            role_id: user.role_id,
            department_id: user.department_id,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
  });
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ message: 'Logout successful' });
    });
  });

module.exports = router;
