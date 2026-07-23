const express = require('express');
const { body, query } = require('express-validator');
const gymFinderController = require('../controllers/gymFinderController');
const { protectOwner } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const Gym = require('../models/Gym');
const { sendGymAddedEmail } = require('../utils/email');

const router = express.Router();

// Owner handler to fetch gyms of authenticated owner
const getOwnerGyms = async (req, res, next) => {
  try {
    const gyms = await Gym.find({ ownerId: req.owner._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: gyms,
      statusCode: 200
    });
  } catch (error) {
    return next(error);
  }
};

// Owner handler to register a new gym
const addOwnerGym = async (req, res, next) => {
  try {
    const { name, description, phone, email, location, capacity, amenities, hours } = req.body;
    
    // Validation
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Gym name must be between 3 and 100 characters", statusCode: 400 });
    }
    if (!description || description.trim().length < 20 || description.trim().length > 1000) {
      return res.status(400).json({ success: false, message: "Description must be between 20 and 1000 characters", statusCode: 400 });
    }
    if (!phone || phone.replace(/\D/g, '').length !== 10) {
      return res.status(400).json({ success: false, message: "Invalid phone number (must be 10 digits)", statusCode: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format", statusCode: 400 });
    }
    if (!location || !location.address || !location.city || !location.state || !location.zipCode) {
      return res.status(400).json({ success: false, message: "Please fill all required location fields", statusCode: 400 });
    }
    if (!capacity || capacity < 20 || capacity > 10000) {
      return res.status(400).json({ success: false, message: "Gym capacity must be between 20 and 10000", statusCode: 400 });
    }

    const gym = new Gym({
      ownerId: req.owner._id,
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      location: {
        address: location.address.trim(),
        city: location.city.trim(),
        state: location.state.trim(),
        zipCode: location.zipCode.trim(),
        latitude: location.latitude,
        longitude: location.longitude
      },
      hours,
      capacity,
      amenities,
      images: req.body.images || [],
      verified: false,
      active: true
    });

    await gym.save();

    req.owner.gyms.push(gym._id);
    await req.owner.save();

    sendGymAddedEmail(req.owner.email, gym.name);

    return res.status(201).json({
      success: true,
      message: "Gym added successfully",
      data: gym,
      statusCode: 201
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/gyms/public
router.get('/public', gymFinderController.getAllGyms);

// GET /api/gyms
// Dispatch to owner logic if Bearer token is present, else public finder logic
router.get('/', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.trim().startsWith('Bearer')) {
    return protectOwner(req, res, (err) => {
      if (err) return next(err);
      return getOwnerGyms(req, res, next);
    });
  } else {
    return gymFinderController.getAllGyms(req, res, next);
  }
});

// POST /api/gyms
// Dispatch to owner logic if Bearer token is present, else public finder logic
router.post('/', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.trim().startsWith('Bearer')) {
    return protectOwner(req, res, (err) => {
      if (err) return next(err);
      return addOwnerGym(req, res, next);
    });
  } else {
    return gymFinderController.registerGym(req, res, next);
  }
});

// GET /api/gyms/nearby
router.get('/nearby', [
  query('lat').exists().isFloat({ min: -90, max: 90 }),
  query('lng').exists().isFloat({ min: -180, max: 180 }),
  query('radius').optional().isFloat({ min: 0.1, max: 100 })
], validate, gymFinderController.getNearbyGyms);

// GET /api/gyms/:id
router.get('/:id', gymFinderController.getGymById);

// PUT /api/gyms/:id
// TODO: Add auth middleware comments on PUT and DELETE routes
router.put('/:id', gymFinderController.updateGym);

// DELETE /api/gyms/:id
// TODO: Add auth middleware comments on PUT and DELETE routes
router.delete('/:id', gymFinderController.deleteGym);

// PATCH /api/gyms/:id/setup
router.patch('/:id/setup', protectOwner, gymFinderController.setupGym);

// POST /api/gyms/upload-image
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const { uploadToCloudinary } = require('../utils/cloudinary');

router.post('/upload-image', protectOwner, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const resultUrl = await uploadToCloudinary(req.file.buffer, 'gyms');
    return res.status(200).json({
      success: true,
      url: resultUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
