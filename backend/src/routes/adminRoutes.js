const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
// const { protect, superAdminOnly } = require('../middleware/auth'); 
// NOTE: Commented out auth middlewares for now. Need to integrate with existing auth setup if required.

// Public Route for Setting Password
router.post('/setup-password', adminController.setupPassword);
router.post('/login', adminController.login);

// Protected Routes (Should be protected in production)
router.post('/create', adminController.createAdmin);
router.get('/all', adminController.getAdmins);
router.get('/city-admins', adminController.getCityAdmins);
router.patch('/:adminId', adminController.updateAdmin);
router.delete('/:adminId', adminController.deleteAdmin);

// Platform Admin Routes
const dashboardRoutes = require('./admin/dashboardRoutes');
const userRoutes = require('./admin/userRoutes');
const gymRoutes = require('./admin/gymRoutes');
const trainerRoutes = require('./admin/trainerRoutes');
const paymentRoutes = require('./admin/paymentRoutes');
const cmsRoutes = require('./admin/cmsRoutes');
const gymOwnerRoutes = require('./admin/gymOwnerRoutes');

router.use('/', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/gyms', gymRoutes);
router.use('/gym-owners', gymOwnerRoutes);
router.use('/trainers', trainerRoutes);
router.use('/', paymentRoutes); // paymentRoutes handles /transactions, /revenue/reports, /payouts
router.use('/cms', cmsRoutes); // Assuming CMS is under /cms based on route file

module.exports = router;
