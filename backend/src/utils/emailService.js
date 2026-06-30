const nodemailer = require('nodemailer');
const { getAdminFrontendUrl } = require('./urls');

const sendSetupEmail = async (email, fullName, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const setupLink = getAdminFrontendUrl(`/admin/setup-password?token=${token}`);

    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'livesale.Fitness - Complete Your Account Setup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1f2937; text-align: center;">Welcome to livesale.Fitness, ${fullName}!</h2>
          <p style="color: #4b5563; font-size: 16px;">Your admin account has been created successfully.</p>
          <p style="color: #4b5563; font-size: 16px;">Please click the button below to set up your secure password. This link will expire in 24 hours.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Set Your Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">If you have any questions, please contact your Super Admin.</p>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} livesale.Fitness. All rights reserved.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

module.exports = {
  sendSetupEmail
};
