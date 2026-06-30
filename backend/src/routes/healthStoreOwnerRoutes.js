const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/healthStoreOwnerController');
const healthStoreOwnerAuth = require('../middleware/healthStoreOwnerAuth');
const { upload, uploadToCloudinaryMiddleware } = require('../middleware/healthStoreUpload');

// All routes require HS Owner auth
router.use(healthStoreOwnerAuth);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Store Profile
router.get('/profile', ctrl.getStoreProfile);
router.put(
  '/profile',
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]),
  uploadToCloudinaryMiddleware('health-store/logos'),
  ctrl.updateStoreProfile
);

// Products
router.post(
  '/products',
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  uploadToCloudinaryMiddleware('health-store/products'),
  ctrl.addProduct
);
router.get('/products', ctrl.getProducts);
router.get('/products/:id', ctrl.getProductById);
router.put(
  '/products/:id',
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'pdfFile', maxCount: 1 },
  ]),
  uploadToCloudinaryMiddleware('health-store/products'),
  ctrl.updateProduct
);
router.delete('/products/:id', ctrl.deleteProduct);
router.patch('/products/:id/toggle-active', ctrl.toggleActiveProduct);
router.put('/products/:id/submit', ctrl.submitForApproval);

// Orders
router.get('/orders', ctrl.getOrders);
router.put('/orders/:id/status', ctrl.updateOrderStatus);

module.exports = router;
