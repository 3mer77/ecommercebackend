// src/config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
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
    // Force IPv4 — Render's free tier can't reach Gmail over IPv6
    family: 4,
});

// Test connection
transporter.verify((error, success) => {
    if (error) {
        console.error(' Email service failed:', error.message);
    } else {
        console.log(' Email service ready');
    }
});

module.exports = transporter;