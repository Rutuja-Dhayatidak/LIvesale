const express = require('express');
const router = express.Router();
const cityAdminController = require('../controllers/cityAdminController');
const cityAdminAuth = require('../middleware/cityAdminAuth');

// Apply City Admin Authentication to all routes
router.use(cityAdminAuth);

router.get('/dashboard', cityAdminController.getDashboardData);
router.get('/users', cityAdminController.getAllUsers);
router.get('/gyms', cityAdminController.getAllGyms);
router.patch('/gyms/:gymId/approve', cityAdminController.approveGym);
router.patch('/gyms/:gymId/reject', cityAdminController.rejectGym);
router.patch('/gyms/:gymId/suspend', cityAdminController.suspendGym);

router.get('/gym-owners', cityAdminController.getAllGymOwners);
router.patch('/gym-owners/:ownerId/approve', cityAdminController.approveGymOwner);
router.patch('/gym-owners/:ownerId/reject', cityAdminController.rejectGymOwner);

router.get('/trainers', cityAdminController.getAllTrainers);
router.get('/trainers/:trainerId', cityAdminController.getTrainerDetails);
router.patch('/trainers/:trainerId/approve', cityAdminController.approveTrainer);
router.patch('/trainers/:trainerId/reject', cityAdminController.rejectTrainer);
router.patch('/trainers/:trainerId/block', cityAdminController.blockTrainer);

router.get('/dietitians', cityAdminController.getAllDietitians);
router.patch('/dietitians/:dietitianId/approve', cityAdminController.approveDietitian);

router.get('/analytics', cityAdminController.getAnalytics);
router.get('/activity-logs', cityAdminController.getActivityLogs);

router.patch('/profile', cityAdminController.updateProfile);
router.patch('/change-password', cityAdminController.changePassword);

module.exports = router;
