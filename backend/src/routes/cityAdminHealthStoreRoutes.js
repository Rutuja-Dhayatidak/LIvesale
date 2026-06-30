const express = require('express');
const router = express.Router();
const cityAdminAuth = require('../middleware/cityAdminAuth');
const ctrl = require('../controllers/cityAdminHealthStoreController');

// All routes protected by City Admin auth
router.use(cityAdminAuth);

// Invite a new Health Store
router.post('/invite', ctrl.inviteHealthStore);

// List all health stores (with filters)
router.get('/', ctrl.getHealthStores);

// Get single store details
router.get('/:id', ctrl.getHealthStoreById);

// Approve store → send set password email
router.put('/:id/approve', ctrl.approveHealthStore);

// Reject store with reason
router.put('/:id/reject', ctrl.rejectHealthStore);

// Request changes from owner
router.put('/:id/request-changes', ctrl.requestChanges);

// Block / Unblock store
router.put('/:id/block', ctrl.blockHealthStore);

// Product approval routes
router.get('/products/pending', ctrl.getProductsForApproval);
router.put('/products/:productId/approve', ctrl.approveProduct);
router.put('/products/:productId/reject', ctrl.rejectProduct);

module.exports = router;
