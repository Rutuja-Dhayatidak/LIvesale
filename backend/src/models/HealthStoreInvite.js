const mongoose = require('mongoose');

const healthStoreInviteSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ownerMobile: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    storeType: {
      type: String,
      enum: ['Diet Only', 'Supplement Only', 'Diet + Supplement'],
      required: true,
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
    },
    inviteTokenExpiry: {
      type: Date,
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    inviteNote: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Invited', 'Expired', 'Used'],
      default: 'Invited',
    },
  },
  { timestamps: true }
);

// Indexes
healthStoreInviteSchema.index({ ownerEmail: 1 });
healthStoreInviteSchema.index({ inviteTokenExpiry: 1 });

module.exports = mongoose.model('HealthStoreInvite', healthStoreInviteSchema);
