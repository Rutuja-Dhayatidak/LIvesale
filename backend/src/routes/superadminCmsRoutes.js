const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/superadminCmsController');
const upload = require('../middleware/upload');

router.get('/banners', cmsController.getBanners);
router.post('/upload', upload.single('media'), cmsController.uploadBanner);
router.delete('/banners/:id', cmsController.deleteBanner);

module.exports = router;
