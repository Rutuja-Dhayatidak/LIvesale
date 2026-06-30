const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/admin/paymentController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/transactions', paymentController.getAllTransactions);
router.get('/revenue/reports', paymentController.getRevenueReports);
router.get('/payouts/pending', paymentController.getPendingPayouts);
router.patch('/payouts/:payoutId/process', paymentController.processPayout);

module.exports = router;
