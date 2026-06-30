const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/userController');
const platformAdminAuth = require('../../middleware/platformAdminAuth');

router.use(platformAdminAuth);

router.get('/', userController.getAllUsers);
router.get('/:userId', userController.getUserDetails);
router.get('/:userId/activity', userController.getUserActivity);
router.patch('/:userId/block', userController.blockUser);
router.patch('/:userId/unblock', userController.unblockUser);
router.delete('/:userId', userController.deleteUser);

module.exports = router;
