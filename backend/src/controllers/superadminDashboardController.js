const User = require('../models/User');
const Gym = require('../models/Gym');
const Membership = require('../models/Membership');
const Booking = require('../models/Booking');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'member' });
    const totalGyms = await Gym.countDocuments();
    
    // Compute real total revenue from paid memberships
    const membershipsPaid = await Membership.find({ status: 'active', paymentStatus: 'paid' });
    const membershipRev = membershipsPaid.reduce((acc, curr) => acc + (curr.pricePaid || 0), 0);

    // Compute trainer bookings revenue
    const bookingsPaid = await Booking.find({ status: { $in: ['confirmed', 'completed'] } });
    const bookingRev = bookingsPaid.reduce((acc, curr) => acc + (curr.price || 0), 0);

    const totalRevenue = membershipRev + bookingRev;

    // Get active bookings
    const activeBookings = await Booking.countDocuments({ status: 'confirmed' });

    res.json({
      totalUsers,
      totalGyms,
      totalRevenue,
      activeBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardCharts = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Group user growth by day (last 30 days)
    const userGrowth = await User.aggregate([
      { $match: { role: 'member', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Group revenue growth by day (last 30 days) from Memberships
    const revenueGrowth = await Membership.aggregate([
      { $match: { status: 'active', paymentStatus: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$pricePaid" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      userGrowth,
      revenueGrowth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
