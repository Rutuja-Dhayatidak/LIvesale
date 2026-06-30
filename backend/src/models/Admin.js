const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  adminType: {
    type: String,
    enum: ['Platform Admin', 'City Admin', 'Gym Manager', 'city_admin', 'platform_admin'],
    required: true,
  },
  assignedCities: {
    type: [String],
    default: [],
  },
  city: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Ref to the super admin creating this admin
  },
  password: {
    type: String,
    default: null,
  },
  passwordSet: {
    type: Boolean,
    default: false,
  },
  setupToken: {
    type: String,
  },
  setupTokenExpiry: {
    type: Date,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
