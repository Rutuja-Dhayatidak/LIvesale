const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: { type: String, required: true },
  day: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  price: { type: Number, required: true },
  paymentId: { type: String },
  orderId: { type: String },
  trainingType: { type: String },
  address: { type: String },
  phone: { type: String },
  expireAt: { type: Date }, // TTL index field
  reminderSent24h: { type: Boolean, default: false },
  reminderSent1h: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  trainerName: { type: String },
  customerName: { type: String },
  customerPhone: { type: String },
  customerEmail: { type: String },
  duration: { type: Number, default: 60 },
  bookingAddress: { type: String },
  gymId: { type: String, default: "" },
  gymName: { type: String, default: "" },
  cancellationReason: { type: String, default: "" },
  refundStatus: { type: String, default: "not_applicable" },
  remindersSent24h: { type: Boolean, default: false },
  remindersSent1h: { type: Boolean, default: false }
}, { timestamps: true });

// Create TTL index on expireAt field
bookingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Composite unique index to prevent race conditions on overlapping bookings
bookingSchema.index(
  { trainerId: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);

module.exports = mongoose.model('Booking', bookingSchema);
