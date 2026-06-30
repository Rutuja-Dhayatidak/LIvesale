const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const platformAdminAuth = async (req, res, next) => {
  try {
    // Expected token from header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret'); // Replace with your actual secret strategy

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (admin.adminType !== 'Platform Admin' && admin.adminType !== 'platform_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }

    if (admin.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Admin account is not active.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Platform Admin Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

module.exports = platformAdminAuth;
