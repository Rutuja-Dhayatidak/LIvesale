const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');

const protectTrainer = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Find trainer
    const trainer = await Trainer.findById(decoded.id);
    if (!trainer) {
      return res.status(401).json({ success: false, message: 'Trainer not found or invalid token' });
    }

    req.trainer = trainer;
    next();
  } catch (error) {
    console.error('Trainer auth error:', error);
    return res.status(401).json({ success: false, message: 'Token expired. Please login again', error: error.message });
  }
};

module.exports = { protectTrainer };
