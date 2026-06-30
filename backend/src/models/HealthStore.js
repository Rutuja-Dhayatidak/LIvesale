const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      enum: ['GST Certificate', 'FSSAI Certificate', 'Shop Act License', 'Owner ID Proof', 'Other'],
    },
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: String,
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String,
  },
  { _id: false }
);

const healthStoreSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    storeType: {
      type: String,
      enum: ['Diet Only', 'Supplement Only', 'Diet + Supplement'],
      required: true,
    },
    description: { type: String, trim: true },
    logo: { type: String },
    bannerImage: { type: String },

    // Owner Info
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    ownerMobile: { type: String, trim: true },
    alternateMobile: { type: String, trim: true },

    // Address
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    landmark: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },

    // Business
    gstNumber: { type: String, trim: true },
    fssaiLicenseNumber: { type: String, trim: true },
    businessRegistrationNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    documents: [documentSchema],
    bankDetails: { type: bankDetailsSchema, default: {} },

    // Operations
    openingTime: { type: String },
    closingTime: { type: String },
    deliveryAvailable: { type: Boolean, default: false },
    deliveryRadiusKm: { type: Number, default: 10 },
    serviceAreas: [{ type: String }],

    // Status & Approval
    status: {
      type: String,
      enum: [
        'Invited',
        'Registration Submitted',
        'Pending Verification',
        'Changes Requested',
        'Approved',
        'Password Pending',
        'Active',
        'Rejected',
        'Blocked',
      ],
      default: 'Invited',
    },
    rejectReason: { type: String },
    changesRequestedReason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    cityAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // References
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStoreOwner' },
    inviteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStoreInvite' },

    // Password Setup
    passwordSetupToken: { type: String },
    passwordSetupTokenExpiry: { type: Date },

    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
healthStoreSchema.index({ city: 1 });
healthStoreSchema.index({ status: 1 });
healthStoreSchema.index({ ownerEmail: 1 });
healthStoreSchema.index({ cityAdmin: 1 });
healthStoreSchema.index({ passwordSetupToken: 1 });

module.exports = mongoose.model('HealthStore', healthStoreSchema);
