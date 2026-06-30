const Gym = require('../../models/Gym');
const ActivityLog = require('../../models/ActivityLog');

exports.getAllGyms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { 'location.city': searchRegex },
        { 'location.address': searchRegex }
      ];
    }

    // Map status filter to actual schema fields
    if (req.query.status && req.query.status !== 'all') {
      if (req.query.status === 'approved') {
        query.verified = true;
        query.active = true;
      } else if (req.query.status === 'pending') {
        query.verified = false;
      } else if (req.query.status === 'suspended') {
        query.active = false;
        query.verified = true;
      } else if (req.query.status === 'rejected') {
        query.verified = false;
        query.active = false;
      }
    }

    if (req.query.city) {
      query['location.city'] = new RegExp(req.query.city, 'i');
    }

    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    let sort = {};
    sort[sortField] = sortOrder;

    const gyms = await Gym.find(query)
      .populate('ownerId', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCount = await Gym.countDocuments(query);

    // Derive a readable status from verified + active flags
    const deriveStatus = (g) => {
      if (g.verified && g.active) return 'approved';
      if (!g.verified && !g.active) return 'rejected';
      if (!g.verified && g.active) return 'pending';
      if (g.verified && !g.active) return 'suspended';
      return 'pending';
    };

    res.status(200).json({
      success: true,
      data: {
        gyms: gyms.map(g => ({
          id: g._id,
          name: g.name,
          city: g.location?.city || 'N/A',
          address: g.location?.address || 'N/A',
          state: g.location?.state || '',
          ownerName: g.ownerId?.name || 'N/A',
          ownerEmail: g.ownerId?.email || g.email || 'N/A',
          ownerPhone: g.ownerId?.phone || g.phone || 'N/A',
          membersCount: g.currentMembers || 0,
          capacity: g.capacity || 0,
          status: deriveStatus(g),
          verified: g.verified,
          active: g.active,
          monthlyRevenue: g.monthlyRevenue || 0,
          rating: g.rating?.average || 0,
          ratingCount: g.rating?.count || 0,
          amenities: g.amenities || [],
          phone: g.phone,
          email: g.email,
          createdAt: g.createdAt
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


exports.getGymDetails = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.gymId).populate('ownerId', 'name email phone');
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });
    
    res.status(200).json({
      success: true,
      data: {
        id: gym._id,
        name: gym.name,
        address: gym.address,
        city: gym.city,
        phone: gym.phone,
        website: gym.website,
        owner: gym.ownerId ? {
          id: gym.ownerId._id,
          name: gym.ownerId.name,
          email: gym.ownerId.email,
          phone: gym.ownerId.phone
        } : { name: gym.ownerName, email: gym.email, phone: gym.phone },
        documents: gym.documents,
        equipment: gym.equipment,
        classes: gym.classes,
        membersCount: gym.membersCount,
        status: gym.status,
        monthlyRevenue: gym.monthlyRevenue,
        rating: gym.rating,
        totalBookings: gym.totalBookings,
        createdAt: gym.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPendingGyms = async (req, res) => {
  req.query.status = 'pending';
  return exports.getAllGyms(req, res);
};

exports.approveGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(
      req.params.gymId, 
      { status: 'approved', approvedAt: new Date() }, 
      { new: true }
    );
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    await ActivityLog.create({
      type: 'gym_approved',
      adminId: req.admin._id,
      description: `Gym ${gym.name} was approved.`
    });

    res.status(200).json({ success: true, message: 'Gym approved successfully', gym: { id: gym._id, status: 'approved' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.rejectGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(
      req.params.gymId, 
      { status: 'rejected', rejectedAt: new Date() }, 
      { new: true }
    );
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    await ActivityLog.create({
      type: 'gym_rejected',
      adminId: req.admin._id,
      description: `Gym ${gym.name} was rejected. Reason: ${req.body.reason || 'None provided'}`
    });

    res.status(200).json({ success: true, message: 'Gym rejected', gym: { id: gym._id, status: 'rejected' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.suspendGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(
      req.params.gymId, 
      { status: 'suspended', suspendedAt: new Date() }, 
      { new: true }
    );
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    await ActivityLog.create({
      type: 'gym_suspended',
      adminId: req.admin._id,
      description: `Gym ${gym.name} was suspended.`
    });

    res.status(200).json({ success: true, message: 'Gym suspended', gym: { id: gym._id, status: 'suspended' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reactivateGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.gymId, { status: 'approved' }, { new: true });
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    await ActivityLog.create({
      type: 'gym_reactivated',
      adminId: req.admin._id,
      description: `Gym ${gym.name} was reactivated.`
    });

    res.status(200).json({ success: true, message: 'Gym reactivated', gym: { id: gym._id, status: 'approved' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteGym = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndDelete(req.params.gymId);
    if (!gym) return res.status(404).json({ success: false, message: 'Gym not found' });

    await ActivityLog.create({
      type: 'gym_deleted',
      adminId: req.admin._id,
      description: `Gym ${gym.name} was deleted.`
    });

    res.status(200).json({ success: true, message: 'Gym deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getGymAnalytics = async (req, res) => {
  try {
    const { gymId } = req.params;
    // Mock analytics for now. In real app, aggregate from Transaction/User models
    res.status(200).json({
      success: true,
      data: {
        memberGrowth: [{ date: "2024-01-01", count: 400 }],
        revenueGrowth: [{ date: "2024-01-01", amount: 450000 }],
        bookingTrends: [],
        topClasses: [{ name: "Yoga", count: 500 }],
        avgRating: 4.8
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
