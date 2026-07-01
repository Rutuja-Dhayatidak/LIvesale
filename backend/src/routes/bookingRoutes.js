const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protectUser } = require('../middleware/authMiddleware');

// 1. Initiate booking (requires customer/user auth)
router.post('/initiate', protectUser, bookingController.initiateBooking);

// 2. Cancel booking (requires user/trainer auth)
router.post('/cancel', protectUser, bookingController.cancelBooking);

// 3. Verify Payment signature (manually triggered from frontend)
router.post('/verify', protectUser, bookingController.verifyPayment);

// 4. Get customer's own bookings
router.get('/my-bookings', protectUser, bookingController.getMyBookings);

// 5. Webhook listener for payment capture (public endpoint)
router.post('/webhook', bookingController.handleRazorpayWebhook);

module.exports = router;
