const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
  planTitle: { type: String, required: true },
  pricePaid: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired'],
    default: 'pending'
  },
  startDate: { type: Date },
  endDate: { type: Date },
  paymentId: { type: String },
  orderId: { type: String, required: true },
  duration: { type: String }, // e.g. "1 Month", "3 Months", "6 Months"
  planId: { type: mongoose.Schema.Types.ObjectId },
  planType: { type: String }, // e.g. "Quarterly"
  durationInMonths: { type: Number }, // e.g. 3
  discountAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String, default: 'razorpay' },
  invoiceNumber: { type: String },
  membershipStatus: { type: String, enum: ['pending', 'active', 'expired'], default: 'pending' },
  facilitiesIncluded: { type: [String], default: [] },
  expireAt: { type: Date } // TTL index field for pending locks
}, { timestamps: true });

// Create TTL index on expireAt field
membershipSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Membership', membershipSchema);
