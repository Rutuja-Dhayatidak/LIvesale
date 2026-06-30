const Banner = require('../../models/Banner');
const GymCategory = require('../../models/GymCategory');
const ActivityLog = require('../../models/ActivityLog');

exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1 });
    res.status(200).json({ success: true, data: { banners } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, description, imageUrl, mediaType, displayOrder, isActive } = req.body;
    const banner = await Banner.create({ title, description, imageUrl, mediaType, displayOrder, isActive });
    
    await ActivityLog.create({
      type: 'banner_created',
      adminId: req.admin._id,
      description: `Banner "${title}" created.`
    });

    res.status(201).json({ success: true, message: 'Banner created', banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.bannerId, req.body, { new: true });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    await ActivityLog.create({
      type: 'banner_updated',
      adminId: req.admin._id,
      description: `Banner "${banner.title}" updated.`
    });

    res.status(200).json({ success: true, message: 'Banner updated', banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.bannerId);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    await ActivityLog.create({
      type: 'banner_deleted',
      adminId: req.admin._id,
      description: `Banner "${banner.title}" deleted.`
    });

    res.status(200).json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ==========================================
// Gym Categories
// ==========================================

exports.getAllGymCategories = async (req, res) => {
  try {
    const categories = await GymCategory.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createGymCategory = async (req, res) => {
  try {
    const { name, imageUrl, isActive } = req.body;
    
    // Check if category already exists
    const existing = await GymCategory.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const category = await GymCategory.create({ name, imageUrl, isActive });
    
    await ActivityLog.create({
      type: 'gym_category_created',
      adminId: req.admin._id,
      description: `Gym Category "${name}" created.`
    });

    res.status(201).json({ success: true, message: 'Gym Category created', category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateGymCategory = async (req, res) => {
  try {
    const category = await GymCategory.findByIdAndUpdate(req.params.categoryId, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Gym Category not found' });

    await ActivityLog.create({
      type: 'gym_category_updated',
      adminId: req.admin._id,
      description: `Gym Category "${category.name}" updated.`
    });

    res.status(200).json({ success: true, message: 'Gym Category updated', category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteGymCategory = async (req, res) => {
  try {
    const category = await GymCategory.findByIdAndDelete(req.params.categoryId);
    if (!category) return res.status(404).json({ success: false, message: 'Gym Category not found' });

    await ActivityLog.create({
      type: 'gym_category_deleted',
      adminId: req.admin._id,
      description: `Gym Category "${category.name}" deleted.`
    });

    res.status(200).json({ success: true, message: 'Gym Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
