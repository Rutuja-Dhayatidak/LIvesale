const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GymOwner',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 1000
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  
  hours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  
  capacity: {
    type: Number,
    required: true,
    min: 20,
    max: 10000
  },
  currentMembers: {
    type: Number,
    default: 0
  },
  amenities: {
    type: [String],
    default: []
  },
  images: {
    type: [String],
    default: []
  },
  
  verified: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  trainers: [
    {
      name: { type: String },
      photo: { type: String },
      experience: { type: String },
      specialization: { type: String },
      bio: { type: String },
      skills: { type: [String], default: [] },
      instagramLink: { type: String },
      certification: { type: String },
      availability: { type: String },
      trainingType: { type: String }
    }
  ],
  about: { type: String },
  heroImage: { type: String },
  galleryImages: { type: [String], default: [] },
  facilities: { type: [String], default: [] },
  membershipPlans: [
    {
      title: { type: String },
      price: { type: Number },
      duration: { type: String },
      validity: { type: String },
      saving: { type: Number },
      isPopular: { type: Boolean, default: false }
    }
  ],
  offers: [
    {
      title: { type: String },
      description: { type: String },
      image: { type: String },
      expiryDate: { type: String },
      offerType: { type: String }
    }
  ],
  freeTrial: {
    available: { type: Boolean, default: false },
    days: { type: Number, default: 0 },
    description: { type: String }
  },
  reviews: [
    {
      userName: { type: String },
      rating: { type: Number },
      comment: { type: String },
      date: { type: Date, default: Date.now }
    }
  ],
  openingTime: { type: String },
  closingTime: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  setupCompleted: { type: Boolean, default: false },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  memberships: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership'
  }],
  monthlyRevenue: {
    type: Number,
    default: 0
  },
  locationPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  }
}, { timestamps: true });

// Pre-save hook to synchronize coordinates from location.latitude & location.longitude
gymSchema.pre('save', function () {
  if (this.location && this.location.latitude !== undefined && this.location.longitude !== undefined) {
    this.locationPoint = {
      type: 'Point',
      coordinates: [parseFloat(this.location.longitude), parseFloat(this.location.latitude)]
    };
  }
});

// CRITICAL: 2dsphere index for spatial nearby queries
gymSchema.index({ locationPoint: '2dsphere' });

module.exports = mongoose.model('Gym', gymSchema);
