const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Подключение к базе данных
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'support_system'  
});

db.connect(err => {
  if (err) {
    console.error('Ошибка подключения к БД:', err);
    return;
  }
  console.log('✅ Подключено к БД');
});

// Получаем всех пользователей с паролями
db.query('SELECT id, username, password FROM users', async (err, results) => {
  if (err) {
    console.error('❌ Ошибка при получении пользователей:', err);
    db.end();
    return;
  }

  console.log(`👥 Найдено пользователей: ${results.length}`);

  for (let user of results) {
    // Проверяем, является ли пароль уже хэшем (bcrypt хэши всегда 60 символов)
    if (user.password.length === 60) {
      console.log(`🔹 Пропущен: ${user.username} (уже хэширован)`);
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err) => {
        if (err) {
          console.error(`❌ Ошибка обновления пароля для ${user.username}:`, err);
        } else {
          console.log(`✅ Пароль обновлён для ${user.username}`);
        }
      });
    } catch (hashErr) {
      console.error(`❌ Ошибка хэширования пароля для ${user.username}:`, hashErr);
    }
  }

  // Закрываем соединение с БД
  db.end();
});
