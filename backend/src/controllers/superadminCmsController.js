const Banner = require('../models/Banner');

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const fs = require('fs');
const { uploadToCloudinary } = require('../utils/cloudinary');

exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    
    // Read local uploaded file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    // Upload to Cloudinary under 'banners' folder
    const cloudinaryUrl = await uploadToCloudinary(fileBuffer, 'banners');

    // Clean up local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('Failed to delete temp file:', err.message);
    }

    const banner = new Banner({
      title: req.body.title || req.file.originalname,
      mediaUrl: cloudinaryUrl,
      mediaType: req.file.mimetype,
    });
    
    await banner.save();

    res.status(201).json({
      banner,
      mediaUrl: banner.mediaUrl,
      mediaName: req.file.originalname,
      mediaType: req.file.mimetype,
      status: 'success'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    // Note: To be fully robust, we would also delete the file from the filesystem here
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
