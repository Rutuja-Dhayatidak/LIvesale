const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/dashboard', dashboardController.getDashboardData);

module.exports = router;
