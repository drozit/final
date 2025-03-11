const mysql = require('mysql2');

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
  console.log('Подключение к БД успешно!');
});

module.exports = db;
