// src/services/emailVerification.service.js
const resend = require('../config/email');
const redis = require('../config/redis');
const userModel = require('../models/user.model');

class EmailVerificationService {
  
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationOtp(userId, email) {
    const otp = this.generateOtp();
    
    // Save OTP to Redis (10 minutes expiry)
    await redis.setex(`otp:${userId}`, 600, otp);

    try {
      const { data, error } = await resend.emails.send({
        from: 'ShopEase <onboarding@resend.dev>',
        to: email,
        subject: 'Your ShopEase Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
              .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
              .logo { text-align: center; font-size: 28px; margin-bottom: 20px; }
              .title { color: #1e293b; text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
              .subtitle { color: #64748b; text-align: center; font-size: 14px; margin-bottom: 30px; }
              .otp-box { background: #6366f1; color: white; text-align: center; font-size: 48px; font-weight: bold; letter-spacing: 15px; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
              .footer { text-align: center; color: #94a3b8; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🛒</div>
              <div class="title">Email Verification</div>
              <div class="subtitle">Use the code below to verify your email address</div>
              <div class="otp-box">${otp}</div>
              <div class="footer">This code expires in 10 minutes.</div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Email failed:', error.message);
        throw error;
      }

      console.log(`📧 Email sent to ${email}`);
    } catch (err) {
      console.error('❌ Email failed:', err.message);
      if (process.env.NODE_ENV !== 'production') {
        return { message: 'OTP generated', demoOtp: otp };
      }
      throw Object.assign(new Error('Failed to send email'), { statusCode: 500 });
    }

    return {
      message: 'OTP sent',
      ...(process.env.NODE_ENV !== 'production' ? { demoOtp: otp } : {})
    };
  }

  async verifyEmailOtp(userId, otp) {
    const storedOtp = await redis.get(`otp:${userId}`);
    
    if (!storedOtp) {
      const error = new Error('OTP expired. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }
    
    if (storedOtp !== otp) {
      const error = new Error('Invalid OTP code');
      error.statusCode = 400;
      throw error;
    }
    
    await userModel.verifyEmail(userId);
    await redis.del(`otp:${userId}`);
    
    return { message: 'Email verified successfully!' };
  }

  async resendOtp(userId, email) {
    await redis.del(`otp:${userId}`);
    return this.sendVerificationOtp(userId, email);
  }
}

module.exports = new EmailVerificationService();