const express = require('express');
const router = express.Router();
const userController = require('../controllers/superadminUserController');

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
