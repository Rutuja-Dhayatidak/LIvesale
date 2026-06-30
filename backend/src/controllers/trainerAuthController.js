const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendTrainerRegistrationEmail, sendTrainerAdminNotification } = require('../utils/email');
const { verifiedEmails } = require('../utils/otpStore');

// Helper to encrypt simple fields if needed. For now, we will store them. Aadhar number and PAN can be masked or saved securely.
// Validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Safe parsing helper functions
const safeParseArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {}
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [input];
};

const safeParseObject = (input) => {
  if (!input) return {};
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (e) {
    return {};
  }
};

exports.registerTrainer = async (req, res) => {
  try {
    const {
      name, email, phone, password, dateOfBirth, gender, city,
      specializations, experience, certifications, bio, languages,
      trainingTypes, pricePerSession, pricePerMonth, availability,
      trialSession, trialPrice, aadharNumber, panNumber,
      bankAccountNumber, bankIfscCode, bankAccountHolderName
    } = req.body;

    // Parse array and object inputs safely before validation
    const parsedSpecializations = safeParseArray(specializations);
    const parsedCertifications = safeParseArray(certifications);
    const parsedLanguages = safeParseArray(languages);
    const parsedTrainingTypes = safeParseArray(trainingTypes);
    const parsedAvailability = safeParseObject(availability);

    // Server-side validations
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Name must be between 3 and 100 characters" });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
    }
    if (!password || password.length < 6 || !/\d/.test(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters and contain at least 1 number" });
    }
    if (!city) {
      return res.status(400).json({ success: false, message: "City is required" });
    }
    if (!parsedSpecializations || parsedSpecializations.length === 0) {
      return res.status(400).json({ success: false, message: "At least 1 specialization is required" });
    }
    const expNum = Number(experience);
    if (isNaN(expNum) || expNum < 0 || expNum > 50) {
      return res.status(400).json({ success: false, message: "Experience must be between 0 and 50 years" });
    }
    if (!bio || bio.trim().length < 50 || bio.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Bio must be between 50 and 500 characters" });
    }
    if (!parsedTrainingTypes || parsedTrainingTypes.length === 0) {
      return res.status(400).json({ success: false, message: "At least 1 training type is required" });
    }
    const sessionPrice = Number(pricePerSession);
    if (isNaN(sessionPrice) || sessionPrice < 100 || sessionPrice > 50000) {
      return res.status(400).json({ success: false, message: "Price per session must be between ₹100 and ₹50,000" });
    }
    if (trialSession === 'true' || trialSession === true) {
      if (!trialPrice || isNaN(Number(trialPrice))) {
        return res.status(400).json({ success: false, message: "Trial price is required when trial is offered" });
      }
    }
    if (!aadharNumber || aadharNumber.replace(/\D/g, '').length !== 12) {
      return res.status(400).json({ success: false, message: "Aadhar number must be exactly 12 digits" });
    }
    if (!panNumber || panNumber.trim().length !== 10) {
      return res.status(400).json({ success: false, message: "PAN number must be exactly 10 characters" });
    }
    if (!bankAccountNumber || bankAccountNumber.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Bank account number must be at least 10 digits" });
    }
    if (!bankIfscCode || bankIfscCode.trim().length !== 11) {
      return res.status(400).json({ success: false, message: "IFSC code must be exactly 11 characters" });
    }
    if (!bankAccountHolderName) {
      return res.status(400).json({ success: false, message: "Account holder name is required" });
    }

    // Check Age (must be at least 18)
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const ageDiff = Date.now() - dobDate.getTime();
      const ageDate = new Date(ageDiff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (age < 18) {
        return res.status(400).json({ success: false, message: "Trainer must be at least 18 years old" });
      }
    }

    // Enforce OTP verification before registration
    const isOtpVerified = verifiedEmails[email.toLowerCase()] && 
                          verifiedEmails[email.toLowerCase()].verified && 
                          Date.now() < verifiedEmails[email.toLowerCase()].expires;
    if (!isOtpVerified) {
      return res.status(400).json({ success: false, message: "Please verify your email via OTP first" });
    }

    // Check unique email and phone in Trainer and User collections
    const existingTrainer = await Trainer.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ]
    });
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone }
      ]
    });
    if (existingTrainer || existingUser) {
      return res.status(400).json({ success: false, message: "Email or phone number is already registered" });
    }

    // Handle File Uploads (Cloudinary fallback)
    const profilePhotoFile = req.files && req.files['profilePhoto'] ? req.files['profilePhoto'][0] : null;
    const aadharCardFile = req.files && req.files['aadharCard'] ? req.files['aadharCard'][0] : null;
    const certificatesList = req.files && req.files['certificates'] ? req.files['certificates'] : [];

    // File validation sizes (max 5MB)
    if (profilePhotoFile && profilePhotoFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Profile photo size must be less than 5MB" });
    }
    if (aadharCardFile && aadharCardFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Aadhar Card size must be less than 5MB" });
    }
    for (const cert of certificatesList) {
      if (cert.size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: "Certificate document size must be less than 5MB" });
      }
    }

    if (!aadharCardFile) {
      return res.status(400).json({ success: false, message: "Aadhar Card upload is required" });
    }
    if (certificatesList.length === 0) {
      return res.status(400).json({ success: false, message: "At least one certification document upload is required" });
    }

    let profilePhotoUrl = "";
    let aadharUrl = "";
    let certificateUrls = [];

    try {
      if (profilePhotoFile) {
        profilePhotoUrl = await uploadToCloudinary(profilePhotoFile.buffer, 'trainers/profile');
      }
      aadharUrl = await uploadToCloudinary(aadharCardFile.buffer, 'trainers/kyc');
      for (const cert of certificatesList) {
        const url = await uploadToCloudinary(cert.buffer, 'trainers/certificates');
        certificateUrls.push(url);
      }
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({ success: false, message: "Document upload to Cloudinary failed. Please try again." });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Trainer Document
    const trainer = new Trainer({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      city,
      profilePhoto: profilePhotoUrl,
      specializations: parsedSpecializations,
      experience: expNum,
      certifications: parsedCertifications,
      bio,
      languages: parsedLanguages,
      trainingTypes: parsedTrainingTypes,
      pricePerSession: sessionPrice,
      pricePerMonth: pricePerMonth ? Number(pricePerMonth) : undefined,
      availability: parsedAvailability,
      trialSession: trialSession === 'true' || trialSession === true,
      trialPrice: trialPrice ? Number(trialPrice) : undefined,
      kyc: {
        aadharNumber,
        panNumber,
        aadharUrl,
        certificateUrls,
        verified: false
      },
      bankAccount: {
        accountNumber: bankAccountNumber,
        ifscCode: bankIfscCode,
        accountHolderName: bankAccountHolderName,
        verified: false
      },
      status: 'pending',
      statusHistory: [{ status: 'pending', reason: 'Initial application submitted', changedByRole: 'trainer' }]
    });

    await trainer.save();
    delete verifiedEmails[email.toLowerCase()];

    // Generate JWT token for immediate login after registration
    const token = jwt.sign(
      { id: trainer._id, role: 'trainer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Set cookie as well (for cookie-based auth)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Create User record for auth routing
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: 'trainer',
      city,
      gender: gender ? gender.toLowerCase() : undefined,
      profilePhoto: profilePhotoUrl
    });
    await user.save();

    // Send email to trainer in background (non-blocking)
    sendTrainerRegistrationEmail(trainer.email, trainer.name).catch(err => console.error("Email error:", err));

    // Notify City Admin of trainer's city (or platform admin) in background
    Admin.findOne({ adminType: { $in: ['City Admin', 'city_admin'] }, assignedCities: { $in: [new RegExp(`^${city}$`, 'i')] } })
      .then(cityAdmin => {
        const notificationEmail = cityAdmin ? cityAdmin.email : process.env.ADMIN_EMAIL || 'admin@findgym.com';
        return sendTrainerAdminNotification(trainer.name, trainer.city, notificationEmail);
      })
      .catch(err => console.error("Admin notification error:", err));

    res.status(201).json({
      success: true,
      message: "Trainer registration successful. Application is pending review.",
      token,
      trainerId: trainer._id,
      status: 'pending',
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        status: trainer.status
      }
    });


  } catch (error) {
    console.error("Trainer Register Error:", error);
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
};

exports.loginTrainer = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    const trainer = await Trainer.findOne({ email: email.toLowerCase() });
    if (!trainer) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, trainer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: trainer._id, role: 'trainer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      token,
      trainer: {
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        status: trainer.status
      }
    });
  } catch (error) {
    console.error("Trainer Login Error:", error);
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
};
