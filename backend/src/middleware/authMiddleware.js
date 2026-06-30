const jwt = require('jsonwebtoken');
const GymOwner = require('../models/GymOwner');
const User = require('../models/User');

const parseCookies = (cookieHeader) => {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

const protectOwner = async (req, res, next) => {
  try {
    let token;
    
    // 1. Get from Cookie
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.token) {
      token = cookies.token;
    }
    
    // 2. Get from Header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token missing',
        statusCode: 401
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Find Gym Owner
    const owner = await GymOwner.findById(decoded.id);
    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'Owner not found or invalid token',
        statusCode: 401
      });
    }
    
    req.owner = owner;
    next();
  } catch (error) {
    console.error('Owner auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again',
      error: error.message,
      statusCode: 401
    });
  }
};

const protectUser = async (req, res, next) => {
  try {
    let token;
    
    // 1. Get from Cookie
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.token) {
      token = cookies.token;
    }
    
    // 2. Get from Header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token missing',
        statusCode: 401
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Find User
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or invalid token',
        statusCode: 401
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('User auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again',
      error: error.message,
      statusCode: 401
    });
  }
};

module.exports = {
  protectOwner,
  protectUser
};
