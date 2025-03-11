const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db'); 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const requestRoutes = require('./routes/requestRoutes');
const multer = require("multer");
const path = require('path');
const { sendEmail } = require("./emailService");

const app = express();
const PORT = 3000;

const session = require('express-session');

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => {
  res.send('API работает!');
});

// Получить все типы заявок
app.get('/api/ticket_types', (req, res) => {
  db.query('SELECT * FROM ticket_types', (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при получении типов заявок', error: err });
    }
    res.json(result);
  });
});

// Получить список всех отделов
app.get('/api/departments', (req, res) => {
  db.query('SELECT * FROM departments', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при получении отделов' });
    }
    res.json(results);
  });
});

// Получить заявки для отдела
app.get('/api/requests/department', (req, res) => {
  const { department_id } = req.query;
  if (!department_id) {
    return res.status(400).json({ message: 'Не указан ID отдела' });
  }

  db.query('SELECT * FROM requests WHERE department_id = ?', [department_id], (error, requests) => {
    if (error) {
      console.error('Ошибка при получении заявок отдела:', error);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Заявки для указанного отдела не найдены' });
    }
    res.json(requests);
  });
});



const upload = multer({ dest: "uploads/" });

app.post("/send-document", upload.fields([{ name: "file", maxCount: 1 }]), async (req, res) => {
  const { department, username, email } = req.body;
  const filePath = req.files?.file?.[0]?.path; 

  // Если department_id отсутствует в запросе, используем данные из сессии
  if (!department) {
    department = req.session?.department_id; 
  }

  if (!department || !username || !email || !filePath) {
    return res.status(400).json({ error: 'Отсутствуют обязательные данные' });
  }

  const token = req.headers.authorization?.split(' ')[1]; 
  if (!token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  try {
    const decoded = jwt.verify(token, 'secret-key');
    const userEmail = decoded.email;
    if (!userEmail) {
      return res.status(400).json({ error: "Не найден email в токене" });
    }

    const departmentEmails = {
      "1": "artembril4@gmail.com",
      "2": "artembril4@gmail.com",
      "3": "artembril4@gmail.com"
    };

    const toEmail = departmentEmails[department];
    if (!toEmail) {
      return res.status(400).json({ error: "Отдел не найден" });
    }

    await sendEmail({
      to: toEmail,
      subject: `Новая заявка от ${username}`,
      text: `Пользователь ${username} (${email}) отправил заявку.`,
      filePath,
      username,
      email
    });

    res.json({ message: "Документ отправлен!" });
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    return res.status(500).json({ error: "Ошибка при отправке email", details: error.message });
  }
});

// Обновить статус заявки
app.post('/api/requests/update-status', async (req, res) => {
  const { requestId, status } = req.body;

  try {
    // Получаем данные заявки
    const [request] = await db.promise().query(
      "SELECT r.id, u.email AS user_email, d.email AS department_email FROM requests r JOIN users u ON r.user_id = u.id JOIN departments d ON r.department_id = d.id WHERE r.id = ?",
      [requestId]
    );

    if (!request.length) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const { user_email, department_email } = request[0];

    // Определяем текст сообщения
    let subject, message;
    if (status === "in_progress") {
      subject = "Заявка принята в работу";
      message = `Ваша заявка №${requestId} принята в работу.`;
    } else if (status === "completed") {
      subject = "Заявка завершена";
      message = `Ваша заявка №${requestId} успешно завершена.`;
    } else {
      return res.status(400).json({ message: "Некорректный статус" });
    }

    // Обновляем статус заявки в БД
    await db.promise().query("UPDATE requests SET status = ? WHERE id = ?", [status, requestId]);

    // Отправляем письмо пользователю
    await sendEmail({
      to: user_email,
      subject,
      text: message,
      username: "Администратор",  // Имя администратора
      email: department_email    // Почта отдела
    });

    res.json({ message: `Статус заявки обновлен на ${status}, уведомление отправлено.` });
  } catch (error) {
    console.error("Ошибка обновления статуса:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});


// Получить все заявки для администратора
app.get('/api/admin', (req, res) => {
  db.query('SELECT * FROM requests', (err, requests) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при получении заявок' });
    }
    res.json(requests);
  });
});


app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
