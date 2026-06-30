const jwt = require('jsonwebtoken');
const HealthStoreInvite = require('../models/HealthStoreInvite');
const HealthStore = require('../models/HealthStore');
const HealthStoreOwner = require('../models/HealthStoreOwner');
const { sendRegistrationSubmittedEmail } = require('../utils/email');
const { upload, uploadToCloudinaryMiddleware } = require('../middleware/healthStoreUpload');

// ─── VALIDATE INVITE TOKEN ───────────────────────────────────────────────────
exports.validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await HealthStoreInvite.findOne({ inviteToken: token });
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invalid invite link. Please contact your City Admin.' });
    }

    if (invite.status === 'Used') {
      return res.status(400).json({ success: false, message: 'This invite has already been used.' });
    }

    if (invite.status === 'Expired' || invite.inviteTokenExpiry < new Date()) {
      invite.status = 'Expired';
      await invite.save();
      return res.status(400).json({ success: false, message: 'This invite link has expired. Please contact your City Admin.' });
    }

    res.json({
      success: true,
      message: 'Valid invite',
      data: {
        storeName: invite.storeName,
        ownerName: invite.ownerName,
        ownerEmail: invite.ownerEmail,
        ownerMobile: invite.ownerMobile,
        city: invite.city,
        storeType: invite.storeType,
      },
    });
  } catch (err) {
    console.error('Validate Invite Token Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── REGISTER HEALTH STORE ───────────────────────────────────────────────────
exports.registerHealthStore = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await HealthStoreInvite.findOne({ inviteToken: token });
    if (!invite || invite.status !== 'Invited' || invite.inviteTokenExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invite link.' });
    }

    const store = await HealthStore.findOne({ inviteRef: invite._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Health Store record not found.' });
    }

    // Extract body fields
    const {
      storeName, storeType, description,
      ownerName, ownerMobile, alternateMobile,
      address, city, state, pincode, landmark, latitude, longitude,
      gstNumber, fssaiLicenseNumber, businessRegistrationNumber, panNumber,
      openingTime, closingTime,
      deliveryAvailable, deliveryRadiusKm, serviceAreas,
      bankName, accountHolderName, accountNumber, ifscCode, upiId,
    } = req.body;

    // Uploaded files from middleware
    const files = req.uploadedFiles || {};

    // Update store record
    store.storeName = storeName || store.storeName;
    store.storeType = storeType || store.storeType;
    store.description = description;
    store.ownerName = ownerName || store.ownerName;
    store.ownerMobile = ownerMobile || store.ownerMobile;
    store.alternateMobile = alternateMobile;
    store.address = address;
    store.city = city || store.city;
    store.state = state;
    store.pincode = pincode;
    store.landmark = landmark;
    store.latitude = latitude ? parseFloat(latitude) : undefined;
    store.longitude = longitude ? parseFloat(longitude) : undefined;
    store.gstNumber = gstNumber;
    store.fssaiLicenseNumber = fssaiLicenseNumber;
    store.businessRegistrationNumber = businessRegistrationNumber;
    store.panNumber = panNumber;
    store.openingTime = openingTime;
    store.closingTime = closingTime;
    store.deliveryAvailable = deliveryAvailable === 'true' || deliveryAvailable === true;
    store.deliveryRadiusKm = deliveryRadiusKm ? parseFloat(deliveryRadiusKm) : 10;
    store.serviceAreas = serviceAreas ? (Array.isArray(serviceAreas) ? serviceAreas : serviceAreas.split(',')) : [];
    store.bankDetails = { bankName, accountHolderName, accountNumber, ifscCode, upiId };
    store.status = 'Pending Verification';

    // Handle uploaded files
    if (files.logo) store.logo = files.logo;
    if (files.bannerImage) store.bannerImage = files.bannerImage;
    if (files.documents) {
      const docUrls = Array.isArray(files.documents) ? files.documents : [files.documents];
      store.documents = docUrls.map((url, idx) => ({
        docType: 'Other',
        url,
        uploadedAt: new Date(),
      }));
    }

    await store.save();

    // Mark invite as used
    invite.status = 'Used';
    await invite.save();

    // Send confirmation email
    await sendRegistrationSubmittedEmail(store.ownerEmail, store.ownerName, store.storeName);

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Pending verification by City Admin.',
      data: { storeId: store._id, status: store.status },
    });
  } catch (err) {
    console.error('Register Health Store Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── VALIDATE SET PASSWORD TOKEN ─────────────────────────────────────────────
exports.validateSetPasswordToken = async (req, res) => {
  try {
    const { token } = req.params;

    const store = await HealthStore.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    });

    if (!store) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password setup link.' });
    }

    res.json({
      success: true,
      message: 'Valid token',
      data: { storeName: store.storeName, ownerName: store.ownerName, ownerEmail: store.ownerEmail },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── SET PASSWORD ────────────────────────────────────────────────────────────
exports.setPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const store = await HealthStore.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    });

    if (!store) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password setup link.' });
    }

    // Create HealthStoreOwner account
    let owner = await HealthStoreOwner.findOne({ email: store.ownerEmail });
    if (!owner) {
      owner = new HealthStoreOwner({
        name: store.ownerName,
        email: store.ownerEmail,
        phone: store.ownerMobile,
        healthStore: store._id,
        role: 'health_store_owner',
      });
    }
    owner.password = password;
    owner.passwordSet = true;
    owner.status = 'Active';
    await owner.save();

    // Update store
    store.status = 'Active';
    store.isActive = true;
    store.ownerUserId = owner._id;
    store.passwordSetupToken = undefined;
    store.passwordSetupTokenExpiry = undefined;
    await store.save();

    res.json({
      success: true,
      message: 'Password set successfully. You can now login to your Health Store Panel.',
    });
  } catch (err) {
    console.error('Set Password Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const owner = await HealthStoreOwner.findOne({ email: email.toLowerCase() });
    if (!owner || !owner.passwordSet) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (owner.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Contact admin.' });
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check store is active
    const store = await HealthStore.findById(owner.healthStore);
    if (!store || store.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your Health Store is not active yet.' });
    }

    owner.lastLogin = new Date();
    await owner.save();

    const token = jwt.sign(
      { id: owner._id, role: 'health_store_owner', storeId: store._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          role: owner.role,
          status: owner.status,
        },
        store: {
          _id: store._id,
          storeName: store.storeName,
          storeType: store.storeType,
          city: store.city,
          logo: store.logo,
          status: store.status,
        },
      },
    });
  } catch (err) {
    console.error('HS Owner Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET PROFILE ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const owner = await HealthStoreOwner.findById(req.storeOwner._id).select('-password');
    const store = await HealthStore.findById(req.healthStore._id);
    res.json({ success: true, data: { owner, store } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
