const express = require('express');
const router = express.Router();
const gymController = require('../controllers/superadminGymController');

router.get('/', gymController.getGyms);
router.post('/', gymController.createGym);
router.patch('/:id', gymController.updateGym);
router.delete('/:id', gymController.deleteGym);

module.exports = router;
