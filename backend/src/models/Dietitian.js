const mongoose = require('mongoose');

const dietitianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  city: { type: String, required: true },
  profilePhoto: { type: String },
  specializations: [{ type: String }],
  experience: { type: String },
  bio: { type: String },
  status: { type: String, enum: ['pending', 'verified', 'blocked'], default: 'pending' },
  clientsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Dietitian', dietitianSchema);
