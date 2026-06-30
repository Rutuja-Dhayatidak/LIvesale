const express = require('express');
const router = express.Router();
const multer = require('multer');
const trainerController = require('../controllers/trainerController');
const { protectTrainer } = require('../middleware/trainerAuth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(protectTrainer);

router.get('/profile', trainerController.getTrainerProfile);
router.put('/profile', upload.fields([{ name: 'profilePhoto', maxCount: 1 }]), trainerController.updateTrainerProfile);
router.get('/status', trainerController.getTrainerStatus);
router.post('/reapply', upload.fields([{ name: 'aadharCard', maxCount: 1 }, { name: 'certificates', maxCount: 3 }]), trainerController.reapplyTrainer);
router.put('/availability', trainerController.updateAvailability);
router.get('/bookings', trainerController.getTrainerBookings);
router.get('/earnings', trainerController.getTrainerEarnings);

module.exports = router;
