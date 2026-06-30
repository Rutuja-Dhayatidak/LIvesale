const HealthStoreProduct = require('../models/HealthStoreProduct');
const HealthStore = require('../models/HealthStore');

// ─── GET DIET / FOOD PRODUCTS ─────────────────────────────────────────────────
exports.getDietProducts = async (req, res) => {
  try {
    const { city, category, priceMin, priceMax, rating, page = 1, limit = 12, search } = req.query;

    const filter = {
      approvalStatus: 'Live',
      isLive: true,
      isActive: true,
      productType: { $in: ['Diet', 'Food'] },
    };

    if (city) filter.city = { $regex: city, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (priceMin || priceMax) {
      filter.oneTimePrice = {};
      if (priceMin) filter.oneTimePrice.$gte = parseFloat(priceMin);
      if (priceMax) filter.oneTimePrice.$lte = parseFloat(priceMax);
    }
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Verify store is active via lookup
    const activeStoreIds = await HealthStore.distinct('_id', { status: 'Active', isActive: true });
    filter.healthStore = { $in: activeStoreIds };

    const [products, total] = await Promise.all([
      HealthStoreProduct.find(filter)
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('healthStore', 'storeName city logo'),
      HealthStoreProduct.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get Diet Products Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET SUPPLEMENT PRODUCTS ─────────────────────────────────────────────────
exports.getSupplementProducts = async (req, res) => {
  try {
    const { city, category, priceMin, priceMax, rating, page = 1, limit = 12, search } = req.query;

    const filter = {
      approvalStatus: 'Live',
      isLive: true,
      isActive: true,
      productType: 'Supplement',
    };

    if (city) filter.city = { $regex: city, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (priceMin || priceMax) {
      filter.sellingPrice = {};
      if (priceMin) filter.sellingPrice.$gte = parseFloat(priceMin);
      if (priceMax) filter.sellingPrice.$lte = parseFloat(priceMax);
    }
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
      ];
    }

    const activeStoreIds = await HealthStore.distinct('_id', { status: 'Active', isActive: true });
    filter.healthStore = { $in: activeStoreIds };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      HealthStoreProduct.find(filter)
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('healthStore', 'storeName city logo'),
      HealthStoreProduct.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get Supplement Products Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET PRODUCT BY ID ───────────────────────────────────────────────────────
exports.getProductById = async (req, res) => {
  try {
    const product = await HealthStoreProduct.findOne({
      _id: req.params.id,
      isLive: true,
      approvalStatus: 'Live',
      isActive: true,
    }).populate('healthStore', 'storeName city logo openingTime closingTime deliveryAvailable deliveryRadiusKm rating');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found or not available' });

    // Also check store active
    const store = await HealthStore.findOne({ _id: product.healthStore._id, status: 'Active' });
    if (!store) return res.status(404).json({ success: false, message: 'Store not available' });

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET STORE BY ID ─────────────────────────────────────────────────────────
exports.getStoreById = async (req, res) => {
  try {
    const store = await HealthStore.findOne({
      _id: req.params.id,
      status: 'Active',
      isActive: true,
    }).select('-passwordSetupToken -passwordSetupTokenExpiry -bankDetails -documents -panNumber -gstNumber -fssaiLicenseNumber -businessRegistrationNumber');

    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const products = await HealthStoreProduct.find({
      healthStore: store._id,
      isLive: true,
      approvalStatus: 'Live',
    }).select('name category images sellingPrice oneTimePrice rating productType');

    res.json({ success: true, data: { store, products } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
