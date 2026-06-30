const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/healthStorePaymentController');
const { protectUser } = require('../middleware/authMiddleware');

// All routes require user auth
router.post('/create-order', protectUser, ctrl.createRazorpayOrder);
router.post('/verify', protectUser, ctrl.verifyPayment);
router.get('/orders', protectUser, ctrl.getUserOrders);

module.exports = router;
