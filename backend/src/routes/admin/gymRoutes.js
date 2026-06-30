const express = require('express');
const router = express.Router();
const gymController = require('../../controllers/admin/gymController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/', gymController.getAllGyms);
router.get('/pending', gymController.getPendingGyms);
router.get('/:gymId', gymController.getGymDetails);
router.patch('/:gymId/approve', gymController.approveGym);
router.patch('/:gymId/reject', gymController.rejectGym);
router.patch('/:gymId/suspend', gymController.suspendGym);
router.patch('/:gymId/reactivate', gymController.reactivateGym);
router.delete('/:gymId', gymController.deleteGym);
router.get('/:gymId/analytics', gymController.getGymAnalytics);

module.exports = router;
