const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { sendSetupEmail } = require('../utils/emailService');

// Create Admin (Super Admin only)
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, adminType, status, city, assignedCities } = req.body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone is required' });
    }
    if (!adminType) {
      return res.status(400).json({ success: false, message: 'Admin type is required' });
    }

    // Clean adminType
    let resolvedAdminType = adminType;
    if (adminType === 'platform_admin') {
      resolvedAdminType = 'platform_admin';
    } else if (adminType === 'city_admin') {
      resolvedAdminType = 'city_admin';
    }

    // If city admin, city is required
    let finalAssignedCities = assignedCities || [];
    let savedCity = city;
    if (resolvedAdminType === 'city_admin') {
      const selectedCity = city || (assignedCities && assignedCities[0]);
      if (!selectedCity) {
        return res.status(400).json({ success: false, message: 'City is required for city admin' });
      }
      savedCity = selectedCity;
      finalAssignedCities = [selectedCity];
    } else {
      savedCity = null;
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create admin
    const admin = new Admin({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      adminType: resolvedAdminType,
      status: status || 'Active',
      assignedCities: finalAssignedCities,
      city: savedCity,
      setupToken,
      setupTokenExpiry,
      passwordSet: false,
      emailVerified: false,
    });

    await admin.save();

    // Send email safely
    let emailSent = false;
    let emailWarning = '';
    try {
      emailSent = await sendSetupEmail(admin.email, admin.fullName, setupToken);
      if (!emailSent) {
        emailWarning = ' (Warning: Invitation email failed to send)';
        console.warn('Admin created but email failed to send');
      }
    } catch (err) {
      emailWarning = ' (Warning: Invitation email failed to send)';
      console.error('Failed to send setup email:', err);
    }

    res.status(201).json({
      success: true,
      message: `Admin created successfully.${emailWarning}`,
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        role: admin.adminType,
        city: admin.city,
        status: admin.status
      }
    });

  } catch (error) {
    console.error('Error in createAdmin controller:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin.', error: error.message });
  }
};

// Get All Admins
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password -setupToken').sort({ createdAt: -1 });
    res.status(200).json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admins.', error: error.message });
  }
};

// Update Admin
exports.updateAdmin = async (req, res) => {
  try {
    const { fullName, phone, adminType, status } = req.body;
    const adminId = req.params.adminId;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { fullName, phone, adminType, status },
      { new: true, runValidators: true }
    ).select('-password -setupToken');

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    res.status(200).json({ success: true, message: 'Admin updated successfully', admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update admin.', error: error.message });
  }
};

// Delete Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const admin = await Admin.findByIdAndDelete(adminId);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    res.status(200).json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete admin.', error: error.message });
  }
};

// Setup Password (Public)
exports.setupPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Find admin by token and check expiry
    const admin = await Admin.findOne({
      setupToken: token,
      setupTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired setup link.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update admin
    admin.password = hashedPassword;
    admin.passwordSet = true;
    admin.emailVerified = true;
    admin.setupToken = undefined;
    admin.setupTokenExpiry = undefined;

    await admin.save();

    res.status(200).json({ success: true, message: 'Password set successfully.' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to setup password.', error: error.message });
  }
};

// Get City Admins with their gym owners and gyms (Platform Admin view)
exports.getCityAdmins = async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const GymOwner = require('../models/GymOwner');
    const Gym = require('../models/Gym');

    // Fetch all city admins
    const cityAdmins = await Admin.find({ adminType: 'city_admin' })
      .select('-password -setupToken -setupTokenExpiry')
      .sort({ createdAt: -1 });

    // For each city admin, find gym owners in their city and count gyms
    const result = await Promise.all(
      cityAdmins.map(async (admin) => {
        const city = admin.city || (admin.assignedCities && admin.assignedCities[0]);

        let gymOwners = [];
        let gymCount = 0;

        if (city) {
          // Find gym owners who have gyms in this city
          const gymsInCity = await Gym.find({ 'location.city': new RegExp(`^${city}$`, 'i') })
            .select('ownerId name location verified active');
          
          gymCount = gymsInCity.length;

          // Get unique owner IDs
          const ownerIds = [...new Set(gymsInCity.map(g => g.ownerId?.toString()).filter(Boolean))];

          // Fetch owner details
          const owners = await GymOwner.find({ _id: { $in: ownerIds } })
            .select('name email phone status gyms');

          // Attach gyms to each owner
          gymOwners = owners.map(owner => {
            const ownerGyms = gymsInCity.filter(g => g.ownerId?.toString() === owner._id.toString());
            return {
              _id: owner._id,
              name: owner.name,
              email: owner.email,
              phone: owner.phone,
              status: owner.status,
              gymCount: ownerGyms.length,
              gyms: ownerGyms.map(g => ({
                _id: g._id,
                name: g.name,
                city: g.location?.city,
                address: g.location?.address,
                verified: g.verified,
                active: g.active
              }))
            };
          });
        }

        return {
          _id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          phone: admin.phone,
          city: city || 'Not Assigned',
          status: admin.status,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt,
          gymOwnerCount: gymOwners.length,
          gymCount,
          gymOwners
        };
      })
    );

    res.status(200).json({ success: true, cityAdmins: result });
  } catch (error) {
    console.error('Error in getCityAdmins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch city admins.', error: error.message });
  }
};

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    let userToLogin = admin;
    let isSuperAdmin = false;

    if (!admin) {
      // Try to find Super Admin in User model
      const User = require('../models/User');
      const superAdmin = await User.findOne({ email: email.toLowerCase(), role: 'superadmin' });
      
      if (!superAdmin) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }
      userToLogin = superAdmin;
      isSuperAdmin = true;
    } else {
      if (!admin.passwordSet) {
        return res.status(401).json({ success: false, message: 'Please setup your password first.' });
      }

      if (admin.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Account is not active. Please contact super admin.' });
      }
    }

    const isMatch = await bcrypt.compare(password, userToLogin.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: userToLogin._id, 
        email: userToLogin.email, 
        role: isSuperAdmin ? 'Super Admin' : userToLogin.adminType 
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: userToLogin._id,
        fullName: isSuperAdmin ? userToLogin.name : userToLogin.fullName,
        email: userToLogin.email,
        adminType: isSuperAdmin ? 'Super Admin' : userToLogin.adminType
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
  }
};
