const Gym = require('../models/Gym');

exports.getGyms = async (req, res) => {
  try {
    const gyms = await Gym.find().populate('ownerId');
    res.json({ gyms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGym = async (req, res) => {
  try {
    const gym = new Gym(req.body);
    await gym.save();
    res.status(201).json({ gym });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    res.json({ gym });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndDelete(req.params.id);
    if (!gym) return res.status(404).json({ message: 'Gym not found' });
    res.json({ message: 'Gym deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
