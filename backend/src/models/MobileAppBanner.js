const mongoose = require('mongoose');

const mobileAppBannerSchema = new mongoose.Schema({
  bannerImage: { type: String, required: true },
  smallTitle: { type: String },
  headline: { type: String },
  subtitle: { type: String },
  discountText: { type: String },
  buttonText: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MobileAppBanner', mobileAppBannerSchema, 'mobile_app_banners');
