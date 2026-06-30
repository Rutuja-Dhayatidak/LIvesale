const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/healthStoreAuthController');
const healthStoreOwnerAuth = require('../middleware/healthStoreOwnerAuth');
const { upload, uploadToCloudinaryMiddleware } = require('../middleware/healthStoreUpload');

// ── Public: Invite Token Validation ──────────────────────────────────────────
router.get('/invite/:token', ctrl.validateInviteToken);

// ── Public: Registration (multipart form with file upload) ───────────────────
router.post(
  '/register/:token',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'documents', maxCount: 5 },
  ]),
  uploadToCloudinaryMiddleware('health-store/registration'),
  ctrl.registerHealthStore
);

// ── Public: Set Password Token Validation ────────────────────────────────────
router.get('/set-password/:token', ctrl.validateSetPasswordToken);

// ── Public: Set Password ─────────────────────────────────────────────────────
router.post('/set-password/:token', ctrl.setPassword);

// ── Public: Login ────────────────────────────────────────────────────────────
router.post('/login', ctrl.login);

// ── Protected: Profile ───────────────────────────────────────────────────────
router.get('/profile', healthStoreOwnerAuth, ctrl.getProfile);

module.exports = router;
