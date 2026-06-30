const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStoreProduct' },
    productType: { type: String, enum: ['Diet', 'Food', 'Supplement'] },
    name: { type: String },
    image: { type: String },
    quantity: { type: Number, default: 1 },
    purchaseType: { type: String, enum: ['One Time', 'Monthly'], default: 'One Time' },
    price: { type: Number, required: true },
    flavor: { type: String },
    size: { type: String },
    sku: { type: String },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: String,
    mobile: String,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
  },
  { _id: false }
);

const healthStoreOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    healthStore: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthStore', required: true },
    city: { type: String },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    address: { type: addressSchema },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Pending',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    invoiceNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indexes
healthStoreOrderSchema.index({ customer: 1 });
healthStoreOrderSchema.index({ healthStore: 1 });
healthStoreOrderSchema.index({ orderStatus: 1 });
healthStoreOrderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('HealthStoreOrder', healthStoreOrderSchema);
