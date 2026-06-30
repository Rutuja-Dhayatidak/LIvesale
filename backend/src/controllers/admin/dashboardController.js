const User = require('../../models/User');
const Gym = require('../../models/Gym');
const Transaction = require('../../models/Transaction');
const ActivityLog = require('../../models/ActivityLog');

exports.getDashboardData = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const prevThirtyDaysAgo = new Date(thirtyDaysAgo);
    prevThirtyDaysAgo.setDate(prevThirtyDaysAgo.getDate() - 30);

    // KPIs
    const totalUsers = await User.countDocuments({ status: { $ne: 'blocked' } });
    const prevTotalUsers = await User.countDocuments({ status: { $ne: 'blocked' }, createdAt: { $lt: thirtyDaysAgo } });
    const userChange = prevTotalUsers ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 100;

    const totalGyms = await Gym.countDocuments({ status: 'approved' });
    const prevTotalGyms = await Gym.countDocuments({ status: 'approved', createdAt: { $lt: thirtyDaysAgo } });
    const gymChange = prevTotalGyms ? ((totalGyms - prevTotalGyms) / prevTotalGyms) * 100 : 100;

    const currentRevenue = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = currentRevenue.length ? currentRevenue[0].total : 0;

    const prevRevenueAgg = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: prevThirtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const prevRevenue = prevRevenueAgg.length ? prevRevenueAgg[0].total : 0;
    const revenueChange = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 100;

    const activeBookings = await Transaction.countDocuments({ type: { $in: ['gym_booking', 'trainer_booking'] }, status: 'success', date: { $gte: thirtyDaysAgo } });
    const prevActiveBookings = await Transaction.countDocuments({ type: { $in: ['gym_booking', 'trainer_booking'] }, status: 'success', date: { $gte: prevThirtyDaysAgo, $lt: thirtyDaysAgo } });
    const bookingChange = prevActiveBookings ? ((activeBookings - prevActiveBookings) / prevActiveBookings) * 100 : 100;

    // Charts
    // Note: This is a simplified group-by-date for mock purposes.
    // In production, we'd use robust MongoDB Date Operators or aggregate differently depending on DB structure.
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).then(res => res.map(r => ({ date: r._id, count: r.count })));

    const revenueGrowth = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, amount: { $sum: "$amount" } } },
      { $sort: { _id: 1 } }
    ]).then(res => res.map(r => ({ date: r._id, amount: r.amount })));

    // Quick Stats
    const topGyms = await Gym.find({ status: 'approved' }).sort({ membersCount: -1 }).limit(5).select('name membersCount');
    const Trainer = require('../../models/Trainer');
    const topTrainers = await Trainer.find({ status: 'verified' }).sort({ rating: -1 }).limit(5).select('name rating');

    // Recent Activities
    const recentActivities = await ActivityLog.find().sort({ timestamp: -1 }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          totalGyms,
          totalRevenue,
          activeBookings,
          userChange: userChange.toFixed(1),
          gymChange: gymChange.toFixed(1),
          revenueChange: revenueChange.toFixed(1),
          bookingChange: bookingChange.toFixed(1)
        },
        charts: {
          userGrowth,
          revenueGrowth
        },
        quickStats: {
          topGyms: topGyms.map(g => ({ id: g._id, name: g.name, members: g.membersCount })),
          topTrainers: topTrainers.map(t => ({ id: t._id, name: t.name, rating: t.rating }))
        },
        recentActivities: recentActivities.map(a => ({
          id: a._id,
          type: a.type,
          description: a.description,
          timestamp: a.timestamp,
          icon: a.type // Simplification: Map type to some icon string
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard Data Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
