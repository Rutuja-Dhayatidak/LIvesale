const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  type: { type: String, enum: ['gym_booking', 'trainer_booking', 'food_order', 'supplement'], required: true },
  amount: { type: Number, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // Gym, Trainer, etc.
  status: { type: String, enum: ['success', 'pending', 'failed'], default: 'pending' },
  paymentMethod: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
