const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const GymOwner = require('../models/GymOwner');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendRegistrationEmail, sendAdminNotification, sendOTPEmail } = require('../utils/email');
const { protectUser } = require('../middleware/authMiddleware');
const { otps, verifiedEmails } = require('../utils/otpStore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// POST /api/auth/gym-owner-register
router.post('/gym-owner-register', upload.fields([
  { name: 'kycDocument', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 }
]), async (req, res) => {
  try {
    const ownerName = req.body.ownerName || req.body.name;
    const { email, phone, password, gstNumber } = req.body;

    // Parse bank details (supports nested objects or direct flat fields)
    const bankName = req.body.bankName || (req.body.bankAccount ? req.body.bankAccount.bankName : '');
    const accountNumber = req.body.accountNumber || (req.body.bankAccount ? req.body.bankAccount.accountNumber : '');
    const accountHolderName = req.body.accountHolderName || (req.body.bankAccount ? req.body.bankAccount.accountHolderName : '');
    const ifscCode = req.body.ifscCode || (req.body.bankAccount ? req.body.bankAccount.ifscCode : '');

    // Parse kyc details
    const aadharNumber = req.body.aadharNumber || (req.body.kyc ? req.body.kyc.aadharNumber : '');
    const panNumber = req.body.panNumber || (req.body.kyc ? req.body.kyc.panNumber : '');

    // Validation checks
    if (!ownerName || ownerName.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Name must be at least 3 characters", statusCode: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format", statusCode: 400 });
    }
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone number (must be 10 digits)", statusCode: 400 });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters", statusCode: 400 });
    }
    if (!aadharNumber || aadharNumber.replace(/\D/g, '').length !== 12) {
      return res.status(400).json({ success: false, message: "Invalid Aadhar number (must be 12 digits)", statusCode: 400 });
    }
    if (!panNumber || panNumber.trim().length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid PAN number (must be 10 characters)", statusCode: 400 });
    }
    if (!accountNumber || accountNumber.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Account number must be at least 10 digits", statusCode: 400 });
    }
    if (!ifscCode || ifscCode.trim().length !== 11) {
      return res.status(400).json({ success: false, message: "Invalid IFSC code (must be 11 characters)", statusCode: 400 });
    }

    // Check unique email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered", statusCode: 400 });
    }

    // Check files
    const kycDocFile = req.files && req.files['kycDocument'] ? req.files['kycDocument'][0] : null;
    const bankProofFile = req.files && req.files['bankProof'] ? req.files['bankProof'][0] : null;

    if (!kycDocFile) {
      return res.status(400).json({ success: false, message: "KYC Document file upload is required", statusCode: 400 });
    }
    if (!bankProofFile) {
      return res.status(400).json({ success: false, message: "Bank Proof file upload is required", statusCode: 400 });
    }

    // Upload files to Cloudinary
    let kycDocumentUrl, bankProofUrl;
    try {
      kycDocumentUrl = await uploadToCloudinary(kycDocFile.buffer, 'kyc');
      bankProofUrl = await uploadToCloudinary(bankProofFile.buffer, 'bank_proof');
    } catch (uploadError) {
      return res.status(500).json({ success: false, message: "Document upload failed. Please try again.", statusCode: 500 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Gym Owner
    const gymOwner = new GymOwner({
      name: ownerName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      gstNumber,
      bankAccount: {
        bankName,
        accountNumber,
        accountHolderName,
        ifscCode,
        verified: false
      },
      kyc: {
        aadharNumber,
        panNumber,
        kycDocumentUrl,
        bankProofUrl,
        verified: false
      }
    });

    await gymOwner.save();

    // Create User record
    const user = new User({
      name: ownerName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: 'gym_owner',
      gymOwnerId: gymOwner._id
    });

    await user.save();

    // Send emails
    sendRegistrationEmail(gymOwner.email, gymOwner.name);
    sendAdminNotification(gymOwner.name, gymOwner.email, gymOwner.phone, aadharNumber.substring(8), panNumber);

    res.status(200).json({
      success: true,
      message: "Registration successful. Awaiting admin approval.",
      data: {
        gymOwnerId: gymOwner._id,
        status: gymOwner.status
      },
      statusCode: 200
    });

  } catch (error) {
    console.error("Gym owner register error:", error);
    res.status(500).json({ success: false, message: "Registration failed. Please try again.", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/gym-owner-login
router.post('/gym-owner-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please fill all required fields", statusCode: 400 });
    }

    const gymOwner = await GymOwner.findOne({ email: email.toLowerCase() });
    if (!gymOwner) {
      return res.status(400).json({ success: false, message: "Invalid credentials", statusCode: 400 });
    }

    const isMatch = await bcrypt.compare(password, gymOwner.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials", statusCode: 400 });
    }

    if (gymOwner.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: "Your account is not approved yet. Please wait for City Admin to verify and approve your documents.",
        statusCode: 403
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: gymOwner._id, role: 'gym_owner' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Operation successful",
      data: {
        token,
        owner: {
          _id: gymOwner._id,
          name: gymOwner.name,
          email: gymOwner.email,
          status: gymOwner.status
        }
      },
      statusCode: 200
    });
  } catch (error) {
    console.error("Gym owner login error:", error);
    res.status(500).json({ success: false, message: "Login failed. Please try again.", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/register (Normal User)
router.post('/register', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { email, phone, password, fullName, age, gender, height, weight, fitnessGoal, location, city } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: "Email, password and full name are required", statusCode: 400 });
    }

    // Check unique email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered", statusCode: 400 });
    }

    // Upload file to Cloudinary if provided
    let profilePhotoUrl = '';
    if (req.file) {
      try {
        profilePhotoUrl = await uploadToCloudinary(req.file.buffer, 'profile_photos');
      } catch (uploadError) {
        console.error("Profile photo upload error:", uploadError);
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User record
    const user = new User({
      name: fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      age: age ? parseInt(age) : undefined,
      gender,
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      fitnessGoal,
      location,
      city,
      profilePhoto: profilePhotoUrl,
      role: 'member' // normal user
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "User registered successfully!",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email
      },
      statusCode: 200
    });
  } catch (error) {
    console.error("User register error:", error);
    res.status(500).json({ success: false, message: "Registration failed. Please try again.", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/login (Normal User)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please fill all required fields", statusCode: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials", statusCode: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials", statusCode: 400 });
    }

    if (user.role === 'gym_owner') {
      const gymOwner = await GymOwner.findOne({ email: email.toLowerCase() });
      if (gymOwner && gymOwner.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: "Your account is not approved yet. Please wait for City Admin to verify and approve your documents.",
          statusCode: 403
        });
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      statusCode: 200
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ success: false, message: "Login failed. Please try again.", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required", statusCode: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in-memory
    otps[email.toLowerCase()] = {
      otp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    const emailSent = await sendOTPEmail(email.toLowerCase(), otp);
    if (!emailSent) {
      return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again.", statusCode: 500 });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email!",
      statusCode: 200
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({ success: false, message: "Error sending OTP", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required", statusCode: 400 });
    }

    const record = otps[email.toLowerCase()];
    if (!record) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one.", statusCode: 400 });
    }

    if (Date.now() > record.expires) {
      delete otps[email.toLowerCase()];
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one.", statusCode: 400 });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP code", statusCode: 400 });
    }

    // OTP verified successfully
    verifiedEmails[email.toLowerCase()] = { verified: true, expires: Date.now() + 15 * 60 * 1000 };
    delete otps[email.toLowerCase()];
    res.status(200).json({
      success: true,
      message: "OTP verified successfully!",
      statusCode: 200
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP", error: error.message, statusCode: 500 });
  }
});

// GET /api/auth/me (Get authenticated user profile)
router.get('/me', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'favoriteGyms',
        select: 'name location heroImage images rating reviewsCount address'
      })
      .populate({
        path: 'favoriteTrainers',
        select: 'name photo profileImage specializations specialization experience trainingTypes rating pricePerSession'
      });
    res.status(200).json({
      success: true,
      data: user,
      statusCode: 200
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ success: false, message: "Server error fetching profile details", error: error.message, statusCode: 500 });
  }
});

// PUT /api/auth/profile (Update authenticated user profile)
router.put('/profile', protectUser, upload.single('profilePhoto'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", statusCode: 404 });
    }

    let { 
      name, phone, age, gender, height, weight, fitnessGoal, location, city,
      foodPreference, dietGoal, allergies, specialRemark,
      trainerGenderPreference, preferredTrainingMode
    } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (age) user.age = parseInt(age) || undefined;
    if (gender) user.gender = gender;
    if (height) user.height = parseFloat(height) || undefined;
    if (weight) user.weight = parseFloat(weight) || undefined;
    if (fitnessGoal) user.fitnessGoal = fitnessGoal;
    if (location) user.location = location;
    if (city) user.city = city;
    
    if (foodPreference) user.foodPreference = foodPreference;
    if (dietGoal) user.dietGoal = dietGoal;
    if (allergies) {
      if (typeof allergies === 'string') {
        try {
          user.allergies = JSON.parse(allergies);
        } catch (e) {
          user.allergies = allergies.split(',').map(s => s.trim()).filter(Boolean);
        }
      } else if (Array.isArray(allergies)) {
        user.allergies = allergies;
      }
    }
    if (specialRemark !== undefined) user.specialRemark = specialRemark;
    
    if (trainerGenderPreference) user.trainerGenderPreference = trainerGenderPreference;
    if (preferredTrainingMode) user.preferredTrainingMode = preferredTrainingMode;

    // If file provided, upload to Cloudinary
    if (req.file) {
      try {
        const profilePhotoUrl = await uploadToCloudinary(req.file.buffer, 'profile_photos');
        user.profilePhoto = profilePhotoUrl;
      } catch (uploadError) {
        console.error("Profile photo upload error:", uploadError);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      data: user,
      statusCode: 200
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/trainer/:trainerId/review
router.post('/trainer/:trainerId/review', protectUser, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { trainerId } = req.params;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5", statusCode: 400 });
    }

    const Trainer = require('../models/Trainer');
    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found", statusCode: 404 });
    }

    // Recalculate average star rating
    const currentAverage = trainer.rating?.average || 0;
    const currentCount = trainer.rating?.count || 0;

    const newCount = currentCount + 1;
    const newAverage = Math.round(((currentAverage * currentCount + Number(rating)) / newCount) * 10) / 10;

    trainer.rating = {
      average: newAverage,
      count: newCount
    };

    if (comment) {
      trainer.review = comment;
    }

    await trainer.save();

    res.status(200).json({
      success: true,
      message: "Review submitted successfully!",
      rating: trainer.rating,
      statusCode: 200
    });
  } catch (error) {
    console.error("Submit review error:", error);
    res.status(500).json({ success: false, message: "Failed to submit review", error: error.message, statusCode: 500 });
  }
});

// POST /api/auth/favorites/gyms/:gymId (Toggle favorite gym)
router.post('/favorites/gyms/:gymId', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (!user.favoriteGyms) user.favoriteGyms = [];
    
    const index = user.favoriteGyms.indexOf(req.params.gymId);
    let isFavorite = false;
    if (index > -1) {
      user.favoriteGyms.splice(index, 1);
      isFavorite = false;
    } else {
      user.favoriteGyms.push(req.params.gymId);
      isFavorite = true;
    }
    
    await user.save();
    res.json({ success: true, isFavorite, message: isFavorite ? 'Added to favorites' : 'Removed from favorites' });
  } catch (err) {
    console.error("Toggle favorite gym error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/favorites/trainers/:trainerId (Toggle favorite trainer)
router.post('/favorites/trainers/:trainerId', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (!user.favoriteTrainers) user.favoriteTrainers = [];
    
    const index = user.favoriteTrainers.indexOf(req.params.trainerId);
    let isFavorite = false;
    if (index > -1) {
      user.favoriteTrainers.splice(index, 1);
      isFavorite = false;
    } else {
      user.favoriteTrainers.push(req.params.trainerId);
      isFavorite = true;
    }
    
    await user.save();
    res.json({ success: true, isFavorite, message: isFavorite ? 'Added to favorites' : 'Removed from favorites' });
  } catch (err) {
    console.error("Toggle favorite trainer error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/favorites/invoices/download (Download invoice HTML file)
router.get('/favorites/invoices/download', async (req, res) => {
  try {
    const { item, price, date, order, userName, userEmail, userPhone } = req.query;

    const totalAmount = Number(price?.replace(/[^\d]/g, '') || '0');
    const subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
    const gst = Math.round((totalAmount - subtotal) * 100) / 100;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${order}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h2 { margin: 0; color: #FF7A00; }
    .section-title { font-weight: bold; margin-top: 20px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .total-box { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <h2>LiveSale Fitness</h2>
      <p>Official Transaction Receipt</p>
    </div>
    
    <div class="info-row">
      <div>
        <strong>Invoice No:</strong> ${order || 'N/A'}<br>
        <strong>Date:</strong> ${date || 'N/A'}
      </div>
      <div style="text-align: right;">
        <strong>Status:</strong> <span style="color: green;">PAID</span>
      </div>
    </div>
    
    <div class="section-title">Billed To:</div>
    <div class="info-row">
      <div>
        <strong>Name:</strong> ${userName || 'User'}<br>
        <strong>Email:</strong> ${userEmail || 'N/A'}<br>
        <strong>Phone:</strong> ${userPhone || 'N/A'}
      </div>
    </div>
    
    <table class="table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${item || 'Fitness Service'}</td>
          <td>1</td>
          <td>${price || 'N/A'}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="total-box">
      <p style="font-size: 14px; font-weight: normal; margin: 5px 0;">Subtotal (Excl. GST): ₹${subtotal.toFixed(2)}</p>
      <p style="font-size: 14px; font-weight: normal; margin: 5px 0;">GST (18%): ₹${gst.toFixed(2)}</p>
      <p style="margin: 10px 0; color: #FF7A00;">Total Amount Paid: ${price || 'N/A'}</p>
    </div>
    
    <div class="footer">
      Thank you for choosing LiveSale Fitness!<br>
      This is an electronically generated receipt, no signature required.
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${order || 'Receipt'}.html"`);
    res.send(htmlContent);
  } catch (err) {
    res.status(500).send("Error generating invoice download: " + err.message);
  }
});

module.exports = router;
