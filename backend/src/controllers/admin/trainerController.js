const Trainer = require('../../models/Trainer');
const Admin = require('../../models/Admin');
const User = require('../../models/User');
const ActivityLog = require('../../models/ActivityLog');
const {
  sendTrainerApprovalEmail,
  sendTrainerRejectionEmail,
  sendTrainerBlockEmail
} = require('../../utils/email');

// Detect requesting admin's type
const getAdminRole = (admin) => {
  if (!admin) return 'unknown';
  return admin.adminType || 'unknown';
};

const isSuperOrPlatform = (admin) => {
  const role = getAdminRole(admin);
  return ['Super Admin', 'Platform Admin', 'platform_admin'].includes(role);
};

exports.getAllTrainers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.city) {
      query.city = new RegExp(`^${req.query.city}$`, 'i');
    }

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const trainers = await Trainer.find(query).sort(sort).skip(skip).limit(limit);
    const totalCount = await Trainer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        trainers: trainers.map(t => ({
          id: t._id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          city: t.city,
          specialization: t.specializations?.join(', '),
          status: t.status,
          rating: t.rating?.average || 0,
          clientCount: t.totalBookings || 0,
          createdAt: t.createdAt,
          rejectionReason: t.rejectionReason,
          blockedReason: t.blockedReason
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTrainerDetails = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    res.status(200).json({
      success: true,
      data: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        city: trainer.city,
        gender: trainer.gender,
        dateOfBirth: trainer.dateOfBirth,
        profilePhoto: trainer.profilePhoto,
        specializations: trainer.specializations,
        certifications: trainer.certifications,
        experience: trainer.experience,
        bio: trainer.bio,
        languages: trainer.languages,
        trainingTypes: trainer.trainingTypes,
        pricePerSession: trainer.pricePerSession,
        pricePerMonth: trainer.pricePerMonth,
        trialSession: trainer.trialSession,
        trialPrice: trainer.trialPrice,
        availability: trainer.availability,
        status: trainer.status,
        statusHistory: trainer.statusHistory,
        rejectionReason: trainer.rejectionReason,
        blockedReason: trainer.blockedReason,
        reapplyCount: trainer.reapplyCount,
        verifiedBy: trainer.verifiedBy,
        kyc: {
          aadharUrl: trainer.kyc?.aadharUrl,
          certificateUrls: trainer.kyc?.certificateUrls,
          aadharNumber: trainer.kyc?.aadharNumber ? `XXXX XXXX ${trainer.kyc.aadharNumber.slice(-4)}` : null,
          panNumber: trainer.kyc?.panNumber ? `XXXXX${trainer.kyc.panNumber.slice(-5)}` : null,
          verified: trainer.kyc?.verified
        },
        rating: trainer.rating,
        totalBookings: trainer.totalBookings,
        totalEarnings: trainer.totalEarnings,
        createdAt: trainer.createdAt,
        approvedAt: trainer.approvedAt,
        activatedAt: trainer.activatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.approveTrainer = async (req, res) => {
  try {
    const { notes } = req.body;
    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    // Validate admin roles
    const adminRole = getAdminRole(req.admin);
    const isAllowedAdmin = ['Super Admin', 'Platform Admin', 'platform_admin', 'City Admin', 'city_admin'].includes(adminRole);
    if (!isAllowedAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin role required." });
    }

    // City admin city check
    if (adminRole === 'City Admin' || adminRole === 'city_admin') {
      if (!req.admin.assignedCities) {
        return res.status(403).json({ success: false, message: "City Admin has no assigned cities" });
      }
      const hasAccess = req.admin.assignedCities.some(c => c.toLowerCase() === trainer.city?.toLowerCase());
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "You don't have access to this city's trainers" });
      }
    }

    trainer.status = 'approved';
    trainer.approvedAt = new Date();
    trainer.approvedBy = req.admin._id;
    trainer.verifiedBy = {
      adminId: req.admin._id,
      adminRole,
      verifiedAt: new Date(),
      notes: notes || ''
    };
    trainer.statusHistory.push({
      status: 'approved',
      changedBy: req.admin._id,
      changedByRole: adminRole,
      reason: notes || 'Application approved',
      changedAt: new Date()
    });

    await trainer.save();

    await ActivityLog.create({
      type: 'trainer_approved',
      adminId: req.admin._id,
      city: trainer.city,
      description: `Trainer "${trainer.name}" approved by ${req.admin.fullName || adminRole}`
    });

    await sendTrainerApprovalEmail(trainer.email, trainer.name);

    res.status(200).json({ success: true, message: 'Trainer approved', trainer: { id: trainer._id, status: 'approved' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.rejectTrainer = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    // Validate admin roles
    const adminRole = getAdminRole(req.admin);
    const isAllowedAdmin = ['Super Admin', 'Platform Admin', 'platform_admin', 'City Admin', 'city_admin'].includes(adminRole);
    if (!isAllowedAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin role required." });
    }

    // City admin city check
    if (adminRole === 'City Admin' || adminRole === 'city_admin') {
      if (!req.admin.assignedCities) {
        return res.status(403).json({ success: false, message: "City Admin has no assigned cities" });
      }
      const hasAccess = req.admin.assignedCities.some(c => c.toLowerCase() === trainer.city?.toLowerCase());
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "You don't have access to this city's trainers" });
      }
    }

    trainer.status = 'rejected';
    trainer.rejectionReason = rejectionReason;
    trainer.rejectedAt = new Date();
    trainer.rejectedBy = req.admin._id;
    trainer.statusHistory.push({
      status: 'rejected',
      changedBy: req.admin._id,
      changedByRole: adminRole,
      reason: rejectionReason,
      changedAt: new Date()
    });

    await trainer.save();

    await ActivityLog.create({
      type: 'trainer_rejected',
      adminId: req.admin._id,
      city: trainer.city,
      description: `Trainer "${trainer.name}" rejected. Reason: ${rejectionReason}`
    });

    await sendTrainerRejectionEmail(trainer.email, trainer.name, rejectionReason, trainer.reapplyCount);

    res.status(200).json({ success: true, message: 'Trainer rejected', trainer: { id: trainer._id, status: 'rejected' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.blockTrainer = async (req, res) => {
  try {
    const { blockedReason } = req.body;
    if (!blockedReason) {
      return res.status(400).json({ success: false, message: 'Block reason is required' });
    }

    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    const adminRole = getAdminRole(req.admin);
    if ((adminRole === 'City Admin' || adminRole === 'city_admin') && req.admin.assignedCities) {
      const hasAccess = req.admin.assignedCities.some(c => c.toLowerCase() === trainer.city?.toLowerCase());
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "You don't have access to this city's trainers" });
      }
    }

    trainer.status = 'blocked';
    trainer.blockedReason = blockedReason;
    trainer.statusHistory.push({
      status: 'blocked',
      changedBy: req.admin._id,
      changedByRole: adminRole,
      reason: blockedReason,
      changedAt: new Date()
    });

    await trainer.save();

    await ActivityLog.create({
      type: 'trainer_blocked',
      adminId: req.admin._id,
      city: trainer.city,
      description: `Trainer "${trainer.name}" blocked. Reason: ${blockedReason}`
    });

    await sendTrainerBlockEmail(trainer.email, trainer.name, blockedReason);

    res.status(200).json({ success: true, message: 'Trainer blocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.unblockTrainer = async (req, res) => {
  try {
    // Only Platform Admin and Super Admin can unblock
    const adminRole = getAdminRole(req.admin);
    if (!isSuperOrPlatform(req.admin)) {
      return res.status(403).json({ success: false, message: 'Only Platform Admin or Super Admin can unblock trainers' });
    }

    const trainer = await Trainer.findById(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    trainer.status = 'active';
    trainer.blockedReason = undefined;
    trainer.statusHistory.push({
      status: 'active',
      changedBy: req.admin._id,
      changedByRole: adminRole,
      reason: 'Unblocked by admin',
      changedAt: new Date()
    });

    await trainer.save();

    await ActivityLog.create({
      type: 'trainer_unblocked',
      adminId: req.admin._id,
      city: trainer.city,
      description: `Trainer "${trainer.name}" unblocked`
    });

    res.status(200).json({ success: true, message: 'Trainer unblocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTrainer = async (req, res) => {
  try {
    // Only Super Admin can delete
    const adminRole = getAdminRole(req.admin);
    if (!['Super Admin'].includes(adminRole)) {
      return res.status(403).json({ success: false, message: 'Only Super Admin can permanently delete trainers' });
    }

    const trainer = await Trainer.findByIdAndDelete(req.params.trainerId);
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });

    // Also delete from User collection
    await User.deleteOne({ email: trainer.email, role: 'trainer' });

    await ActivityLog.create({
      type: 'trainer_deleted',
      adminId: req.admin._id,
      description: `Trainer "${trainer.name}" permanently deleted`
    });

    res.status(200).json({ success: true, message: 'Trainer permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTrainerStats = async (req, res) => {
  try {
    const total = await Trainer.countDocuments();
    const pending = await Trainer.countDocuments({ status: 'pending' });
    const approved = await Trainer.countDocuments({ status: 'approved' });
    const active = await Trainer.countDocuments({ status: 'active' });
    const rejected = await Trainer.countDocuments({ status: 'rejected' });
    const blocked = await Trainer.countDocuments({ status: 'blocked' });

    const byCity = await Trainer.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({ success: true, data: { total, pending, approved, active, rejected, blocked, byCity } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPublicTrainers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    let query = { status: { $in: ['active', 'approved'] } };

    if (req.query.city) query.city = new RegExp(`^${req.query.city}$`, 'i');
    if (req.query.specialization) query.specializations = { $in: [new RegExp(req.query.specialization, 'i')] };
    if (req.query.trainingType) query.trainingTypes = { $in: [req.query.trainingType] };
    if (req.query.minPrice) query.pricePerSession = { $gte: Number(req.query.minPrice) };
    if (req.query.maxPrice) query.pricePerSession = { ...query.pricePerSession, $lte: Number(req.query.maxPrice) };

    const trainers = await Trainer.find(query)
      .select('name profilePhoto specializations pricePerSession rating trainingTypes city experience review clients')
      .skip(skip).limit(limit);
    const total = await Trainer.countDocuments(query);
 
    res.status(200).json({
      success: true,
      trainers: trainers.map(t => ({
        _id: t._id,
        name: t.name,
        photo: t.profilePhoto,
        specializations: t.specializations,
        pricePerSession: t.pricePerSession,
        rating: t.rating?.average || 0,
        trainingTypes: t.trainingTypes,
        city: t.city,
        experience: t.experience,
        review: t.review,
        clients: t.clients
      })),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPublicTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findOne({ _id: req.params.trainerId, status: { $in: ['active', 'approved'] } })
      .select('-password -kyc -bankAccount -statusHistory -rejectionReason -blockedReason');
    if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found or not active' });

    res.status(200).json({ success: true, trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
