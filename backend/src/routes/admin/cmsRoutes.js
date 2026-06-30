const express = require('express');
const router = express.Router();
const cmsController = require('../../controllers/admin/cmsController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/banners', cmsController.getAllBanners);
router.post('/banners', cmsController.createBanner);
router.patch('/banners/:bannerId', cmsController.updateBanner);
router.delete('/banners/:bannerId', cmsController.deleteBanner);

// Gym Categories Routes
router.get('/gym-categories', cmsController.getAllGymCategories);
router.post('/gym-categories', cmsController.createGymCategory);
router.patch('/gym-categories/:categoryId', cmsController.updateGymCategory);
router.delete('/gym-categories/:categoryId', cmsController.deleteGymCategory);

module.exports = router;
