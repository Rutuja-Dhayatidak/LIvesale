const crypto = require('crypto');
const HealthStoreInvite = require('../models/HealthStoreInvite');
const HealthStore = require('../models/HealthStore');
const HealthStoreProduct = require('../models/HealthStoreProduct');
const HealthStoreOwner = require('../models/HealthStoreOwner');
const {
  sendHealthStoreInviteEmail,
  sendHealthStoreApprovedEmail,
  sendHealthStoreRejectedEmail,
  sendChangesRequestedEmail,
  sendProductApprovedEmail,
  sendProductRejectedEmail,
} = require('../utils/email');
const { getFrontendUrl, getAdminFrontendUrl } = require('../utils/urls');

// ─── INVITE HEALTH STORE ─────────────────────────────────────────────────────
exports.inviteHealthStore = async (req, res) => {
  try {
    const { storeName, ownerName, ownerEmail, ownerMobile, city, address, storeType, inviteNote } = req.body;

    if (!storeName || !ownerName || !ownerEmail || !ownerMobile || !city || !storeType) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Check if already invited/active
    const existing = await HealthStore.findOne({ ownerEmail: ownerEmail.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A Health Store with this email already exists' });
    }

    // Enforce city access for City Admin
    const adminRole = req.admin.adminType;
    if (['city_admin', 'City Admin'].includes(adminRole)) {
      const hasAccess = req.admin.assignedCities?.some(
        c => c.toLowerCase() === city.toLowerCase()
      );
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'You do not have access to this city' });
      }
    }

    // Generate invite token (64-char hex)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Save invite record
    const invite = await HealthStoreInvite.create({
      storeName,
      ownerName,
      ownerEmail: ownerEmail.toLowerCase(),
      ownerMobile,
      city,
      address,
      storeType,
      inviteToken,
      inviteTokenExpiry,
      invitedBy: req.admin._id,
      inviteNote,
    });

    // Create initial HealthStore record
    await HealthStore.create({
      storeName,
      storeType,
      ownerName,
      ownerEmail: ownerEmail.toLowerCase(),
      ownerMobile,
      city,
      address,
      status: 'Invited',
      cityAdmin: req.admin._id,
      inviteRef: invite._id,
    });

    // Send invite email
    const inviteLink = getFrontendUrl(`/health-store/register/${inviteToken}`);
    await sendHealthStoreInviteEmail(ownerEmail, ownerName, storeName, inviteLink);

    res.status(201).json({
      success: true,
      message: `Invite sent to ${ownerEmail}`,
      data: { invite },
    });
  } catch (err) {
    console.error('Invite Health Store Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET ALL HEALTH STORES ───────────────────────────────────────────────────
exports.getHealthStores = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    // City Admin only sees their city
    const adminRole = req.admin.adminType;
    if (['city_admin', 'City Admin'].includes(adminRole) && req.admin.assignedCities?.length) {
      const cityRegexes = req.admin.assignedCities.map(c => new RegExp(`^${c}$`, 'i'));
      filter.city = { $in: cityRegexes };
    }

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [stores, total] = await Promise.all([
      HealthStore.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('cityAdmin', 'fullName email')
        .populate('approvedBy', 'fullName email'),
      HealthStore.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stores,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get Health Stores Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET SINGLE HEALTH STORE ─────────────────────────────────────────────────
exports.getHealthStoreById = async (req, res) => {
  try {
    const store = await HealthStore.findById(req.params.id)
      .populate('cityAdmin', 'fullName email phone')
      .populate('approvedBy', 'fullName email')
      .populate('ownerUserId', 'name email phone lastLogin');

    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found' });

    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── APPROVE HEALTH STORE ────────────────────────────────────────────────────
exports.approveHealthStore = async (req, res) => {
  try {
    const store = await HealthStore.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found' });

    if (!['Pending Verification', 'Changes Requested', 'Registration Submitted'].includes(store.status)) {
      return res.status(400).json({ success: false, message: `Cannot approve store with status: ${store.status}` });
    }

    // Generate password setup token
    const passwordSetupToken = crypto.randomBytes(32).toString('hex');
    const passwordSetupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    store.status = 'Password Pending';
    store.approvedBy = req.admin._id;
    store.approvedAt = new Date();
    store.passwordSetupToken = passwordSetupToken;
    store.passwordSetupTokenExpiry = passwordSetupTokenExpiry;
    await store.save();

    // Send approval + set password email
    const setPasswordLink = getAdminFrontendUrl(`/health-store/set-password/${passwordSetupToken}`);
    await sendHealthStoreApprovedEmail(store.ownerEmail, store.ownerName, store.storeName, setPasswordLink);

    res.json({ success: true, message: 'Health Store approved. Password setup email sent.', data: store });
  } catch (err) {
    console.error('Approve Store Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── REJECT HEALTH STORE ─────────────────────────────────────────────────────
exports.rejectHealthStore = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const store = await HealthStore.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found' });

    store.status = 'Rejected';
    store.rejectReason = reason;
    await store.save();

    await sendHealthStoreRejectedEmail(store.ownerEmail, store.ownerName, store.storeName, reason);

    res.json({ success: true, message: 'Health Store rejected', data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── REQUEST CHANGES ─────────────────────────────────────────────────────────
exports.requestChanges = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Reason for changes is required' });

    const store = await HealthStore.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found' });

    store.status = 'Changes Requested';
    store.changesRequestedReason = reason;
    await store.save();

    await sendChangesRequestedEmail(store.ownerEmail, store.ownerName, store.storeName, reason);

    res.json({ success: true, message: 'Changes requested. Email sent to owner.', data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── BLOCK / UNBLOCK ─────────────────────────────────────────────────────────
exports.blockHealthStore = async (req, res) => {
  try {
    const store = await HealthStore.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found' });

    if (store.status === 'Blocked') {
      store.status = 'Active';
      store.isActive = true;
    } else {
      store.status = 'Blocked';
      store.isActive = false;
    }
    await store.save();

    res.json({ success: true, message: `Health Store ${store.status}`, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── GET PRODUCTS FOR APPROVAL ───────────────────────────────────────────────
exports.getProductsForApproval = async (req, res) => {
  try {
    const { type, status = 'Pending Approval', page = 1, limit = 10, search } = req.query;
    const filter = { approvalStatus: status };

    // City Admin city filter
    const adminRole = req.admin.adminType;
    if (['city_admin', 'City Admin'].includes(adminRole) && req.admin.assignedCities?.length) {
      const cityRegexes = req.admin.assignedCities.map(c => new RegExp(`^${c}$`, 'i'));
      filter.city = { $in: cityRegexes };
    }

    if (type) filter.productType = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      HealthStoreProduct.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('healthStore', 'storeName ownerName city')
        .populate('owner', 'name email'),
      HealthStoreProduct.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── APPROVE PRODUCT ─────────────────────────────────────────────────────────
exports.approveProduct = async (req, res) => {
  try {
    const product = await HealthStoreProduct.findById(req.params.productId)
      .populate('healthStore', 'storeName ownerEmail ownerName')
      .populate('owner', 'email name');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.approvalStatus = 'Live';
    product.isLive = true;
    product.approvedBy = req.admin._id;
    product.approvedAt = new Date();
    product.rejectionReason = undefined;
    await product.save();

    // Email to owner
    const ownerEmail = product.owner?.email || product.healthStore?.ownerEmail;
    const ownerName = product.owner?.name || product.healthStore?.ownerName;
    if (ownerEmail) {
      await sendProductApprovedEmail(ownerEmail, ownerName, product.name, product.healthStore?.storeName);
    }

    res.json({ success: true, message: 'Product approved and live', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─── REJECT PRODUCT ──────────────────────────────────────────────────────────
exports.rejectProduct = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const product = await HealthStoreProduct.findById(req.params.productId)
      .populate('healthStore', 'ownerEmail ownerName')
      .populate('owner', 'email name');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.approvalStatus = 'Rejected';
    product.isLive = false;
    product.rejectionReason = reason;
    await product.save();

    const ownerEmail = product.owner?.email || product.healthStore?.ownerEmail;
    const ownerName = product.owner?.name || product.healthStore?.ownerName;
    if (ownerEmail) {
      await sendProductRejectedEmail(ownerEmail, ownerName, product.name, reason);
    }

    res.json({ success: true, message: 'Product rejected. Owner notified.', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
