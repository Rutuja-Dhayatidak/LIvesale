const mongoose = require('mongoose');

const healthStoreReviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    healthStore: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStore', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStoreProduct', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

healthStoreReviewSchema.index({ product: 1 });
healthStoreReviewSchema.index({ healthStore: 1 });
healthStoreReviewSchema.index({ customer: 1 });

module.exports = mongoose.model('HealthStoreReview', healthStoreReviewSchema);
