const User = require('../../models/User');
const ActivityLog = require('../../models/ActivityLog');

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.joinDate = {};
      if (req.query.dateFrom) query.joinDate.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.joinDate.$lte = new Date(req.query.dateTo);
    }

    const sortField = req.query.sortBy || 'joinDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    let sort = {};
    sort[sortField] = sortOrder;

    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password'); // Exclude password

    const totalCount = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          status: u.status,
          joinDate: u.joinDate,
          lastLogin: u.lastLogin,
          fitnessGoal: u.fitnessGoal
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

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // In a real scenario, you'd aggregate totalBookings and totalAmount from Transaction model
    const Transaction = require('../../models/Transaction');
    const bookings = await Transaction.aggregate([
      { $match: { userId: user._id, status: 'success' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);

    const stats = bookings.length ? bookings[0] : { count: 0, amount: 0 };

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        profilePhoto: user.profilePhoto,
        fitnessGoal: user.fitnessGoal,
        location: user.location,
        city: user.city,
        status: user.status,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        totalBookings: stats.count,
        totalAmount: stats.amount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { status: 'blocked' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    await ActivityLog.create({
      type: 'user_blocked',
      userId: user._id,
      adminId: req.admin._id,
      description: `User ${user.name} was blocked. Reason: ${req.body.reason || 'None provided'}`,
    });

    res.status(200).json({ success: true, message: 'User blocked successfully', user: { id: user._id, status: 'blocked' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { status: 'active' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await ActivityLog.create({
      type: 'user_unblocked',
      userId: user._id,
      adminId: req.admin._id,
      description: `User ${user.name} was unblocked.`,
    });

    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // In a real app, you might want to soft delete or handle cascade deletes of bookings, etc.
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const activities = await ActivityLog.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await ActivityLog.countDocuments({ userId: req.params.userId });

    res.status(200).json({
      success: true,
      data: {
        activities: activities.map(a => ({
          id: a._id,
          type: a.type,
          description: a.description,
          timestamp: a.timestamp,
          details: a.metadata
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
