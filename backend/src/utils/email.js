const nodemailer = require('nodemailer');
const { getFrontendUrl, getAdminFrontendUrl } = require('./urls');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    }
  });
};

const sendRegistrationEmail = async (email, name) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Registration Received - livesale.Fitness',
      text: `Thank you for registering as a Gym Owner on livesale.Fitness!\n\nYour registration is under review. We verify all KYC documents within 24-48 hours.\n\nOnce approved, you'll receive a confirmation email and can login to your dashboard.\n\nWhat happens next:\n✓ We review your documents\n✓ You'll receive approval email\n✓ Login and start adding your gyms\n✓ Earn commissions on bookings\n\nFor any questions, contact: support@livesale.fitness`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Registration email failed:', err);
    return false;
  }
};

const sendGymAddedEmail = async (email, gymName) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Gym Added Successfully',
      text: `Great! Your gym ${gymName} has been added successfully.\n\nStatus: Pending Verification\nOur team will verify your gym details within 24 hours. Once verified, it will appear in the livesale.Fitness app.\n\nMeanwhile, you can:\n✓ Add classes\n✓ Add trainers\n✓ Create membership plans\n✓ Set pricing and policies\n\nDashboard: ${getFrontendUrl('/gym-owner-dashboard')}`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Gym addition email failed:', err);
    return false;
  }
};

const sendAdminNotification = async (name, email, phone, pan) => {
  try {
    const transporter = getTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@findgym.com';
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'New Gym Owner Registration - Pending Approval',
      text: `New Gym Owner Registration:\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nPAN: ${pan}\n\nReview at: ${getAdminFrontendUrl('/pending-gym-owners')}`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Admin notification email failed:', err);
    return false;
  }
};

// Trainer Specific Emails
const sendTrainerRegistrationEmail = async (email, name) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Application Received - livesale.Fitness',
      text: `Dear ${name},\n\nYour trainer application has been received. Our team will review your documents within 24-48 hours. We'll notify you by email once a decision has been made.\n\nThank you for choosing livesale.Fitness.`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer registration email failed:', err);
    return false;
  }
};

const sendTrainerApprovalEmail = async (email, name) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Application Approved! - livesale.Fitness',
      text: `Dear ${name},\n\nCongratulations! Your trainer application has been approved. Login to your dashboard and complete your profile setup to go live on livesale.Fitness.\n\nLogin: ${getFrontendUrl('/trainer-login')}`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer approval email failed:', err);
    return false;
  }
};

const sendTrainerRejectionEmail = async (email, name, reason, reapplyCount) => {
  try {
    const transporter = getTransporter();
    const canReapply = reapplyCount < 3;
    const reapplyText = canReapply
      ? `You can reapply with corrected information from your dashboard. (Attempts used: ${reapplyCount}/3)`
      : `You have reached the maximum number of registration attempts (3).`;

    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Application Status Update - livesale.Fitness',
      text: `Dear ${name},\n\nUnfortunately, your application was not approved.\nReason: ${reason}\n\n${reapplyText}\n\nFor any appeals or queries, contact: support@livesale.fitness`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer rejection email failed:', err);
    return false;
  }
};

const sendTrainerActiveEmail = async (email, name, city) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: "You're Live on livesale.Fitness!",
      text: `Dear ${name},\n\nYour profile is now live. Customers in ${city} can find and book you. Check your dashboard to manage bookings.\n\nDashboard: ${getFrontendUrl('/trainer/dashboard')}`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer activation email failed:', err);
    return false;
  }
};

const sendTrainerBlockEmail = async (email, name, reason) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Account Suspended - livesale.Fitness',
      text: `Dear ${name},\n\nYour account has been suspended.\nReason: ${reason}\n\nTo appeal this decision, contact: support@livesale.fitness`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer block email failed:', err);
    return false;
  }
};

const sendTrainerAdminNotification = async (name, city, adminEmail) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: adminEmail || process.env.ADMIN_EMAIL || 'admin@livesale.fitness',
      subject: 'New Trainer Application - Pending Review',
      text: `A new trainer application from ${name} in ${city} is pending review.\n\nReview at: ${getAdminFrontendUrl('/admin/trainers/pending')}`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Trainer admin notification email failed:', err);
    return false;
  }
};

const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verification Code - livesale.Fitness',
      text: `Your verification OTP is: ${otp}\n\nDo not share this OTP with anyone.\nIt is valid for 10 minutes.`
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('OTP email failed:', err);
    return false;
  }
};

// ─── HEALTH STORE EMAILS ──────────────────────────────────────────────────────

const sendHealthStoreInviteEmail = async (email, ownerName, storeName, inviteLink) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'You are Invited to Register Your Health Store on livesale.Fitness',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4444,#cc0000);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale<span style="color:#fff;">.Fitness</span></h1>
            <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Health Store Partner Invitation</p>
          </div>
          <div style="padding:32px;">
            <p style="font-size:16px;">Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">You have been invited to register <strong style="color:#FF4444;">${storeName}</strong> as a Health Store Partner on livesale.Fitness. Click the button below to complete your registration.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#FF4444,#cc0000);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">Register Now</a>
            </div>
            <p style="color:#666;font-size:13px;">This link will expire in 48 hours. If you did not expect this email, please ignore it.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness | support@livesale.fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Health Store invite email failed:', err);
    return false;
  }
};

const sendRegistrationSubmittedEmail = async (email, ownerName, storeName) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Health Store Registration Submitted — livesale.Fitness',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4444,#cc0000);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale.FITNESS</h1>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Your registration for <strong style="color:#FF4444;">${storeName}</strong> has been submitted successfully and is currently <strong>Pending Verification</strong> by our City Admin.</p>
            <p style="color:#ccc;">You will receive an email once the verification is complete. This usually takes 24–48 hours.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Registration submitted email failed:', err);
    return false;
  }
};

const sendHealthStoreApprovedEmail = async (email, ownerName, storeName, setPasswordLink) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🎉 Your Health Store is Approved — Set Your Password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#FF4444,#cc0000);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale.FITNESS</h1>
            <p style="margin:8px 0 0;opacity:0.85;">Congratulations! 🎉</p>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Your Health Store <strong style="color:#FF4444;">${storeName}</strong> has been <strong>Approved</strong>! Click the button below to set your password and access your Health Store Panel.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${setPasswordLink}" style="display:inline-block;background:linear-gradient(135deg,#FF4444,#cc0000);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">Set Your Password</a>
            </div>
            <p style="color:#666;font-size:13px;">This link will expire in 24 hours.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Health Store approved email failed:', err);
    return false;
  }
};

const sendHealthStoreRejectedEmail = async (email, ownerName, storeName, reason) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Health Store Registration Update — livesale.Fitness',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:#333;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale.FITNESS</h1>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Unfortunately, your registration for <strong>${storeName}</strong> has been <strong style="color:#FF4444;">Rejected</strong>.</p>
            <div style="background:#1a1a1a;border-left:4px solid #FF4444;padding:16px;border-radius:4px;margin:20px 0;">
              <p style="margin:0;color:#ccc;"><strong>Reason:</strong> ${reason}</p>
            </div>
            <p style="color:#ccc;">For any queries, contact us at support@livesale.fitness</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Health Store rejected email failed:', err);
    return false;
  }
};

const sendChangesRequestedEmail = async (email, ownerName, storeName, reason) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Changes Required for Your Health Store Registration — livesale.Fitness',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#e6a817,#c4860f);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale.FITNESS</h1>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Some changes are required for your Health Store <strong>${storeName}</strong> registration before it can be approved.</p>
            <div style="background:#1a1a1a;border-left:4px solid #e6a817;padding:16px;border-radius:4px;margin:20px 0;">
              <p style="margin:0;color:#ccc;"><strong>Changes Needed:</strong> ${reason}</p>
            </div>
            <p style="color:#ccc;">Please update your registration and resubmit. Contact support@livesale.fitness for help.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Changes requested email failed:', err);
    return false;
  }
};

const sendProductApprovedEmail = async (email, ownerName, productName, storeName) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: `✅ Product Approved and Live — ${productName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;">livesale.FITNESS</h1>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Great news! Your product <strong style="color:#22c55e;">${productName}</strong> from <strong>${storeName}</strong> has been <strong>Approved</strong> and is now <strong>Live</strong> on the livesale.Fitness Health Store.</p>
            <p style="color:#ccc;">Customers can now discover and purchase your product.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Product approved email failed:', err);
    return false;
  }
};

const sendProductRejectedEmail = async (email, ownerName, productName, reason) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Product Update Required — ${productName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:#333;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:900;">livesale.FITNESS</h1>
          </div>
          <div style="padding:32px;">
            <p>Hello <strong>${ownerName}</strong>,</p>
            <p style="color:#ccc;line-height:1.7;">Your product <strong>${productName}</strong> has been <strong style="color:#FF4444;">Rejected</strong>.</p>
            <div style="background:#1a1a1a;border-left:4px solid #FF4444;padding:16px;border-radius:4px;margin:20px 0;">
              <p style="margin:0;color:#ccc;"><strong>Reason:</strong> ${reason}</p>
            </div>
            <p style="color:#ccc;">Please update your product and resubmit for approval.</p>
            <hr style="border:1px solid #222;margin:24px 0;" />
            <p style="color:#666;font-size:12px;text-align:center;">© livesale.Fitness</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Product rejected email failed:', err);
    return false;
  }
};

module.exports = {
  getTransporter,
  sendRegistrationEmail,
  sendGymAddedEmail,
  sendAdminNotification,
  sendTrainerRegistrationEmail,
  sendTrainerApprovalEmail,
  sendTrainerRejectionEmail,
  sendTrainerActiveEmail,
  sendTrainerBlockEmail,
  sendTrainerAdminNotification,
  sendOTPEmail,
  // Health Store Emails
  sendHealthStoreInviteEmail,
  sendRegistrationSubmittedEmail,
  sendHealthStoreApprovedEmail,
  sendHealthStoreRejectedEmail,
  sendChangesRequestedEmail,
  sendProductApprovedEmail,
  sendProductRejectedEmail,
};
