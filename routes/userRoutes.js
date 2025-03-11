const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  db.query(`SELECT users.id, users.username, users.email, users.role_id, departments.name AS department
            FROM users LEFT JOIN departments ON users.department_id = departments.id`, 
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Ошибка сервера' });
      res.json(results);
  });
});

router.post('/', (req, res) => {
  const { username, password, email, role_id, department_id } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.query('INSERT INTO users (username, password, email, role_id, department_id) VALUES (?, ?, ?, ?, ?)', 
    [username, hashedPassword, email, role_id, department_id], 
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Ошибка сервера' });
      res.status(201).json({ message: 'Пользователь добавлен' });
  });
});

router.delete('/:id', (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Ошибка удаления' });
    res.json({ message: 'Пользователь удалён' });
  });
});

module.exports = router;
