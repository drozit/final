const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware');
const { sendEmail } = require('../emailService'); // Сервис для отправки email

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const user = req.user;
  let query = `SELECT requests.id, requests.title, requests.description, requests.status,
               requests.created_at, requests.updated_at, users.username, users.email, users.role_id,
               IFNULL(departments.name, 'Нет отдела') AS department, ticket_types.name AS ticket_type
               FROM requests
               JOIN users ON requests.user_id = users.id
               LEFT JOIN departments ON requests.department_id = departments.id  
               LEFT JOIN ticket_types ON requests.ticket_type_id = ticket_types.id`;

  const params = [];
  const limit = 5; // количество заявок на странице
  const page = parseInt(req.query.page) || 1; // текущая страница (по умолчанию 1)

  const offset = (page - 1) * limit; // смещение для пагинации

  // Для администратора показываем все заявки, с возможностью фильтрации по отделу и статусу
  if (user.id === 1) {  // Администратор
    if (req.query.department_id) {
      query += ` WHERE requests.department_id = ?`;
      params.push(req.query.department_id);
    }
    if (req.query.status) {
      query += params.length ? ` AND requests.status = ?` : ` WHERE requests.status = ?`;
      params.push(req.query.status);
    }
  } else if (user.role_id === 2) {  // Сотрудник отдела
    query += ` WHERE requests.department_id = ? OR requests.user_id = ?`;
    params.push(user.department_id, user.id);
    if (req.query.status) {
      query += ` AND requests.status = ?`;
      params.push(req.query.status);
    }
  } else {  // Обычный пользователь
    query += ` WHERE requests.user_id = ?`;
    params.push(user.id);
    if (req.query.status) {
      query += ` AND requests.status = ?`;
      params.push(req.query.status);
    }
  }

  query += ` ORDER BY requests.created_at DESC LIMIT ? OFFSET ?`; // Сортировка по дате и пагинация
  params.push(limit, offset); // добавляем параметры лимита и смещения

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});
  


// Добавить заявку
router.post('/', (req, res) => {
  const { title, description, ticket_type_id, department_id, user_id } = req.body;

  if (!title || !description || !ticket_type_id || !user_id) {
    return res.status(400).json({ message: 'Все поля должны быть заполнены' });
  }

  db.query(
    'INSERT INTO requests (title, description, ticket_type_id, department_id, user_id) VALUES (?, ?, ?, ?, ?)', 
    [title, description, ticket_type_id, department_id, user_id], 
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Ошибка при добавлении' });
      res.status(201).json({ message: 'Заявка добавлена' });
  });
});

// Обновить статус заявки
router.post('/update-status', verifyToken, (req, res) => {
  const { requestId, newStatus } = req.body;
  const user = req.user;

  if (!requestId || !newStatus) {
    return res.status(400).json({ message: 'Не указаны id заявки или новый статус' });
  }

  console.log(`Запрос на обновление статуса: requestId = ${requestId}, newStatus = ${newStatus}`);

  const query = 'SELECT user_id, user_email FROM requests WHERE id = ?';
  db.query(query, [requestId], (err, results) => {
    if (err) {
      console.error('Ошибка при получении данных о заявке:', err);
      return res.status(500).json({ message: 'Ошибка при получении данных' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    const { user_id, user_email } = results[0];
    console.log(`Получен user_id заявки: ${user_id}, user_email: ${user_email}`);

    // Получаем email пользователя, если оно отсутствует в поле user_email заявки
    const finalEmail = user_email || '';
    if (!finalEmail) {
      return res.status(400).json({ message: 'Email пользователя не указан для заявки' });
    }

    const updateQuery = 'UPDATE requests SET status = ? WHERE id = ?';
    db.query(updateQuery, [newStatus, requestId], async (err, updateResult) => {
      if (err) {
        console.error('Ошибка при обновлении статуса заявки:', err);
        return res.status(500).json({ message: 'Ошибка при обновлении статуса заявки' });
      }

      // Генерация темы и сообщения в зависимости от статуса
      const subject = newStatus === 'в работе' ? 'Заявка взята в работу' : 'Заявка завершена';
      const message = newStatus === 'в работе' 
        ? `Ваша заявка была взята в работу. Мы начали обработку вашего запроса.` 
        : `Ваша заявка была завершена. Если у вас есть вопросы, пожалуйста, свяжитесь с нами.`;

      try {
        // Отправка email с использованием sendEmail
        await sendEmail({
          to: finalEmail,
          subject,
          text: message,
          username: user.username || 'Неизвестный пользователь',  // Здесь можно подставить имя пользователя из запроса или базы
          email: finalEmail  // Этот email будет использоваться в теле письма
        });
        res.status(200).json({ message: 'Статус заявки обновлен и уведомление отправлено.' });
      } catch (emailErr) {
        console.error('Ошибка при отправке email:', emailErr);
        return res.status(500).json({ message: 'Ошибка при отправке email' });
      }
    });
  });
});


module.exports = router;
