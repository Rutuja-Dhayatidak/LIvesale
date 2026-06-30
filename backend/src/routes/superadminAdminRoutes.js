const express = require('express');
const router = express.Router();
const adminController = require('../controllers/superadminAdminController');

router.get('/', adminController.getAdmins);
router.post('/', adminController.createAdmin);
router.patch('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;
