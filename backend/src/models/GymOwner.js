const mongoose = require('mongoose');

const gymOwnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  gstNumber: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'rejected'],
    default: 'pending'
  },
  
  bankAccount: {
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    ifscCode: { type: String, required: true },
    verified: { type: Boolean, default: false }
  },
  
  kyc: {
    aadharNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    kycDocumentUrl: { type: String, required: true },
    bankProofUrl: { type: String, required: true },
    verified: { type: Boolean, default: false }
  },
  
  verifiedBy: {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    adminRole: { type: String, enum: ['city_admin', 'platform_admin', null], default: null },
    verifiedAt: { type: Date, default: null },
    notes: { type: String, default: null }
  },
  
  rejectionReason: {
    type: String,
    default: null
  },
  gyms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym'
  }],
  totalEarnings: {
    type: Number,
    default: 0
  },
  pendingEarnings: {
    type: Number,
    default: 0
  },
  pendingApprovalSince: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('GymOwner', gymOwnerSchema);
