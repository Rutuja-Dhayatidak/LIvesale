const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/superadminDashboardController');

router.get('/', dashboardController.getDashboardStats);
router.get('/charts', dashboardController.getDashboardCharts);

module.exports = router;
