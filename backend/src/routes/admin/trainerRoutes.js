const express = require('express');
const router = express.Router();
const trainerController = require('../../controllers/admin/trainerController');
const adminAuth = require('../../middleware/adminAuth');

// Both City Admin and Platform Admin can manage trainers (role restrictions enforced in controller)
router.use(adminAuth);

router.get('/stats', trainerController.getTrainerStats);
router.get('/', trainerController.getAllTrainers);
router.get('/:trainerId', trainerController.getTrainerDetails);
router.patch('/:trainerId/approve', trainerController.approveTrainer);
router.patch('/:trainerId/reject', trainerController.rejectTrainer);
router.patch('/:trainerId/block', trainerController.blockTrainer);
router.patch('/:trainerId/unblock', trainerController.unblockTrainer);
router.delete('/:trainerId', trainerController.deleteTrainer);

module.exports = router;
