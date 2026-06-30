const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { protectUser, protectOwner } = require('../middleware/authMiddleware');

// 1. Initiate membership purchase
router.post('/initiate', protectUser, membershipController.initiatePurchase);

// 2. Verify payment signature
router.post('/verify', protectUser, membershipController.verifyPurchase);

// 3. Get Gym Owner's Memberships
router.get('/owner', protectOwner, membershipController.getOwnerGymMemberships);

// 4. Get current user's memberships (profile page)
router.get('/my', protectUser, membershipController.getMyMemberships);

module.exports = router;
