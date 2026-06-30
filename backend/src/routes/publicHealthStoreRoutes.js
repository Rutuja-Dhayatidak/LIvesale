const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publicHealthStoreController');

// Public — no auth required
router.get('/diet', ctrl.getDietProducts);
router.get('/supplements', ctrl.getSupplementProducts);
router.get('/products/:id', ctrl.getProductById);
router.get('/stores/:id', ctrl.getStoreById);

module.exports = router;
