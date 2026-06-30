const Gym = require('../models/Gym');

// Helper function to calculate distance using Haversine formula
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// @desc    Register a new gym
// @route   POST /api/gyms
// @access  Public
exports.registerGym = async (req, res, next) => {
  try {
    const gym = await Gym.create(req.body);
    res.status(201).json({
      success: true,
      data: gym,
      message: 'Gym registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all active gyms
// @route   GET /api/gyms
// @access  Public
exports.getAllGyms = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Gym.countDocuments({ active: true, verified: true });
    const gyms = await Gym.find({ active: true, verified: true })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: gyms,
      pagination: { total, page, limit, totalPages },
      message: 'Gyms fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find gyms within radius using MongoDB $near
// @route   GET /api/gyms/nearby
// @access  Public
exports.getNearbyGyms = async (req, res, next) => {
  try {
    // Parse query params
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 15;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and Longitude query parameters are required and must be valid numbers'
      });
    }

    // Build spatial $near query using locationPoint
    const query = {
      locationPoint: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // [longitude, latitude] GeoJSON order
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      },
      active: true,
      verified: true
    };

    // Retrieve matching active gyms sorted by proximity
    const allNearbyGyms = await Gym.find(query);

    // Calculate haversine distance for each gym and format to 1 decimal place
    const gymsWithDistance = allNearbyGyms.map(gym => {
      // Fallback to coordinates if available, else latitude/longitude from location object
      const gymLng = gym.locationPoint?.coordinates?.[0] || gym.location?.longitude || 0;
      const gymLat = gym.locationPoint?.coordinates?.[1] || gym.location?.latitude || 0;
      const distance = haversineDistance(lat, lng, gymLat, gymLng);
      
      const gymObj = gym.toObject();
      gymObj.distanceKm = parseFloat(distance.toFixed(1));
      return gymObj;
    });

    // Handle pagination in-memory
    const total = gymsWithDistance.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedGyms = gymsWithDistance.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      data: paginatedGyms,
      pagination: { total, page, limit, totalPages },
      message: 'Nearby gyms fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single gym by ID
// @route   GET /api/gyms/:id
// @access  Public
exports.getGymById = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id);
    if (!gym || !gym.active || !gym.verified) {
      return res.status(404).json({
        success: false,
        error: 'Gym not found or pending approval'
      });
    }

    res.status(200).json({
      success: true,
      data: gym,
      message: 'Gym details fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update gym fields
// @route   PUT /api/gyms/:id
// @access  Public
exports.updateGym = async (req, res, next) => {
  try {
    // TODO: Add auth middleware comments on PUT and DELETE routes
    const gym = await Gym.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!gym || !gym.active) {
      return res.status(404).json({
        success: false,
        error: 'Gym not found'
      });
    }

    res.status(200).json({
      success: true,
      data: gym,
      message: 'Gym updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete: set active to false
// @route   DELETE /api/gyms/:id
// @access  Public
exports.deleteGym = async (req, res, next) => {
  try {
    // TODO: Add auth middleware comments on PUT and DELETE routes
    const gym = await Gym.findByIdAndUpdate(req.params.id, { active: false }, { new: true });

    if (!gym) {
      return res.status(404).json({
        success: false,
        error: 'Gym not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gym deactivated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Setup gym advanced details (owner only)
// @route   PATCH /api/gyms/:id/setup
// @access  Private (Owner)
exports.setupGym = async (req, res, next) => {
  try {
    const gym = await Gym.findById(req.params.id);
    if (!gym) {
      return res.status(404).json({ success: false, error: 'Gym not found' });
    }

    // Check ownership
    if (gym.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized to configure this gym' });
    }

    // Update fields
    const fields = [
      'about', 'heroImage', 'galleryImages', 'facilities', 'trainers',
      'membershipPlans', 'offers', 'freeTrial', 'reviews',
      'openingTime', 'closingTime', 'latitude', 'longitude'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        gym[field] = req.body[field];
      }
    });

    // Mark setup completed if basic setup info is present
    if (gym.about && gym.heroImage && gym.membershipPlans && gym.membershipPlans.length > 0) {
      gym.setupCompleted = true;
    }

    await gym.save();

    res.status(200).json({
      success: true,
      data: gym,
      message: 'Gym setup configuration saved successfully'
    });
  } catch (error) {
    next(error);
  }
};
