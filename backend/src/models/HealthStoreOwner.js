const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const healthStoreOwnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, default: null },
    passwordSet: { type: Boolean, default: false },
    healthStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthStore',
      required: true,
    },
    role: { type: String, default: 'health_store_owner', immutable: true },
    status: {
      type: String,
      enum: ['Active', 'Blocked', 'Suspended'],
      default: 'Active',
    },
    lastLogin: { type: Date },
    profilePhoto: { type: String },
  },
  { timestamps: true }
);

// Hash password before save
healthStoreOwnerSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
healthStoreOwnerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('HealthStoreOwner', healthStoreOwnerSchema);
