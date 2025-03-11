const nodemailer = require('nodemailer');  // Добавьте этот импорт
const path = require('path');  // Для работы с путями файлов

const sendEmail = async ({ to, subject, text, filePath, username, email }) => {
    if (!to || !email) {
        console.error('Ошибка: не указан получатель письма');
        throw new Error('Получатель не указан');
    }

    console.log(`Получатель: ${to}`);  // Логирование получателя перед отправкой
    console.log(`Email пользователя: ${email}`);  // Логирование email

    const transporter = nodemailer.createTransport({
        service: "gmail", 
        auth: {
            user: "emailtesterang1@gmail.com", 
            pass: "zgtn amza mzud itlo" 
        }
    });

    const mailOptions = {
        from: "emailtesterang1@gmail.com",
        to,  // Получатель письма
        subject,
        text: `${text} Заявка от ${username} (${email}).`,
        attachments: filePath
            ? [
                {
                    filename: path.basename(filePath),
                    path: filePath,
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Тип контента
                }
              ]
            : []
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Письмо отправлено:', info.response);
    } catch (error) {
        console.error('Ошибка при отправке письма:', error);
        throw new Error('Ошибка при отправке письма');
    }
};

module.exports = { sendEmail };
