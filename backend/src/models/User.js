const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  height: { type: Number }, // in cm
  weight: { type: Number }, // in kg
  fitnessGoal: { type: String },
  location: { type: String },
  city: { type: String },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  joinDate: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  profilePhoto: { type: String },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["superadmin", "admin", "trainer", "member", "gym_owner", "customer", "city_admin"],
    default: "member",
  },
  gymOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GymOwner",
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema, "Mobile User");