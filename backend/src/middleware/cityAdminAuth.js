const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const cityAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    let admin = await Admin.findById(decoded.id);
    let isSuperAdmin = false;

    if (!admin) {
      const user = await User.findById(decoded.id);
      if (user && user.role === 'superadmin') {
        admin = {
          _id: user._id,
          fullName: user.name,
          email: user.email,
          adminType: 'Super Admin',
          status: 'Active'
        };
        isSuperAdmin = true;
      }
    }

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (admin.status !== 'Active' && !isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Admin account is not active.' });
    }

    const role = admin.adminType;
    const isAuthorizedRole = ['Super Admin', 'Platform Admin', 'platform_admin', 'City Admin', 'city_admin'].includes(role);
    if (!isAuthorizedRole) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized admin type.' });
    }

    req.admin = admin;

    // Enforce city authorization
    if (role === 'city_admin' || role === 'City Admin') {
      const targetCity = req.query?.city || req.body?.city;
      if (targetCity) {
        const hasAccess = admin.assignedCities && admin.assignedCities.some(
          c => c.toLowerCase() === targetCity.toLowerCase()
        );
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to this city",
            code: "CITY_ACCESS_DENIED"
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('City Admin Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

module.exports = cityAdminAuth;
