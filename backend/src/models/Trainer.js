const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  // Personal Info
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  dateOfBirth: { type: Date },
  gender: { type: String },
  city: { type: String, required: true },
  profilePhoto: { type: String }, // Cloudinary URL

  // Professional Info
  specializations: [{ type: String }],
  experience: { type: Number },
  certifications: [{ type: String }],
  bio: { type: String },
  languages: [{ type: String }],
  review: { type: String },

  // Service Info
  trainingTypes: [{ type: String }],
  pricePerSession: { type: Number },
  pricePerMonth: { type: Number },
  availability: { type: mongoose.Schema.Types.Mixed },
  trialSession: { type: Boolean, default: false },
  trialPrice: { type: Number },

  // KYC & Documents
  kyc: {
    aadharNumber: { type: String },
    panNumber: { type: String },
    aadharUrl: { type: String }, // Cloudinary URL
    certificateUrls: [{ type: String }], // Cloudinary URLs
    verified: { type: Boolean, default: false }
  },
  bankAccount: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    accountHolderName: { type: String },
    verified: { type: Boolean, default: false }
  },

  // Status Management
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'active', 'rejected', 'blocked'], 
    default: 'pending' 
  },

  statusHistory: [
    {
      status: String,
      changedBy: mongoose.Schema.Types.ObjectId,
      changedByRole: String,
      reason: String,
      changedAt: { type: Date, default: Date.now }
    }
  ],

  rejectionReason: { type: String },
  reapplyCount: { type: Number, default: 0 },
  blockedReason: { type: String },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  rejectedAt: { type: Date },

  verifiedBy: {
    adminId: mongoose.Schema.Types.ObjectId,
    adminRole: String,
    verifiedAt: Date,
    notes: String
  },

  // Stats
  totalBookings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  clients: { type: String, default: "0" },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  approvedAt: { type: Date },
  activatedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Trainer', trainerSchema);
