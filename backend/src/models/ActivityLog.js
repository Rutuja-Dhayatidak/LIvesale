const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'user_signup', 'gym_approved', 'login', 'booking', 'payment', 'profile_update', etc.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The user who performed the action, or the target user if performed by admin
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // If performed by admin
  description: { type: String, required: true },
  city: { type: String },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed } // Flexible object for details
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
