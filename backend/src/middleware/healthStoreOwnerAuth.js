const jwt = require('jsonwebtoken');
const HealthStoreOwner = require('../models/HealthStoreOwner');
const HealthStore = require('../models/HealthStore');

const healthStoreOwnerAuth = async (req, res, next) => {
  try {
    let token;

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Must have role field in token
    if (decoded.role !== 'health_store_owner') {
      return res.status(403).json({ success: false, message: 'Access denied. Not a Health Store Owner.' });
    }

    const owner = await HealthStoreOwner.findById(decoded.id).select('-password');
    if (!owner) {
      return res.status(401).json({ success: false, message: 'Owner not found or token invalid' });
    }

    if (owner.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Contact admin.' });
    }

    // Attach store info
    const store = await HealthStore.findById(owner.healthStore);
    if (!store || store.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your Health Store is not active.' });
    }

    req.storeOwner = owner;
    req.healthStore = store;
    next();
  } catch (error) {
    console.error('HealthStoreOwner Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

module.exports = healthStoreOwnerAuth;
