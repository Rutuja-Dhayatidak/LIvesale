const { validationResult } = require('express-validator');

// Validation middleware check
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      details: errors.array(),
      error: 'Validation failed'
    });
  }
  next();
};

module.exports = validate;
