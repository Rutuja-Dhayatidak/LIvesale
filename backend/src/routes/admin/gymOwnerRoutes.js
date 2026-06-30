const express = require('express');
const router = express.Router();
const cityAdminController = require('../../controllers/cityAdminController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/', cityAdminController.getAllGymOwners);
router.patch('/:ownerId/approve', cityAdminController.approveGymOwner);
router.patch('/:ownerId/reject', cityAdminController.rejectGymOwner);

module.exports = router;
