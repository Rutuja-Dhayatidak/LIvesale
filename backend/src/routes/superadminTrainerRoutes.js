const express = require('express');
const router = express.Router();
const Trainer = require('../models/Trainer');

// GET /api/superadmin/trainers
router.get('/', async (req, res) => {
  try {
    const trainers = await Trainer.find();
    res.json({ trainers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/superadmin/trainers/:trainerId/status
router.patch('/:trainerId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const trainer = await Trainer.findByIdAndUpdate(req.params.trainerId, { status }, { new: true });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    res.json({ success: true, trainer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
