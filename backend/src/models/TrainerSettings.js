const mongoose = require('mongoose');

const trainerSettingsSchema = new mongoose.Schema({
  commissionPercentage: { type: Number, default: 10 },
  maxReapplyCount: { type: Number, default: 3 },
  requiredDocuments: [{ type: String, default: ['aadhar', 'certificate'] }],
  verificationRules: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('TrainerSettings', trainerSettingsSchema);
