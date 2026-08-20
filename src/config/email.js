// src/config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Test connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service failed:', error.message);
    } else {
        console.log('✅ Email service ready');
    }
});

module.exports = transporter;