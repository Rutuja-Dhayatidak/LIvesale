const express = require('express');
const router = express.Router();
const GymOwner = require('../models/GymOwner');

// GET /api/superadmin/gym-owners
router.get('/', async (req, res) => {
  try {
    const owners = await GymOwner.find().populate('gyms');
    res.json({ owners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/superadmin/gym-owners/:ownerId/status
router.patch('/:ownerId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const owner = await GymOwner.findByIdAndUpdate(req.params.ownerId, { status }, { new: true });
    if (!owner) return res.status(404).json({ error: 'Gym owner not found' });
    res.json({ success: true, owner });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
