const Transaction = require('../../models/Transaction');
const ActivityLog = require('../../models/ActivityLog');

exports.getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.userName = searchRegex;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.date.$lte = new Date(req.query.dateTo);
    }

    const sortField = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    let sort = {};
    sort[sortField] = sortOrder;

    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCount = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          userId: t.userId,
          userName: t.userName,
          amount: t.amount,
          type: t.type,
          date: t.date,
          status: t.status,
          paymentMethod: t.paymentMethod
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

exports.getRevenueReports = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, message: 'dateFrom and dateTo are required' });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    const lastYearStartDate = new Date(startDate);
    lastYearStartDate.setFullYear(lastYearStartDate.getFullYear() - 1);
    const lastYearEndDate = new Date(endDate);
    lastYearEndDate.setFullYear(lastYearEndDate.getFullYear() - 1);

    const thisYearTransactions = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: startDate, $lte: endDate } } }
    ]);

    const totalRevenueThisYear = thisYearTransactions.reduce((acc, curr) => acc + curr.amount, 0);

    const lastYearTransactions = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: lastYearStartDate, $lte: lastYearEndDate } } }
    ]);

    const totalRevenueLastYear = lastYearTransactions.reduce((acc, curr) => acc + curr.amount, 0);

    const growth = totalRevenueLastYear ? ((totalRevenueThisYear - totalRevenueLastYear) / totalRevenueLastYear) * 100 : 100;

    // By Type
    const byTypeAgg = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$type', amount: { $sum: '$amount' } } }
    ]);

    const byType = byTypeAgg.map(t => ({ type: t._id, amount: t.amount }));

    // Monthly (Simplified)
    const monthlyRevenueAgg = await Transaction.aggregate([
      { $match: { status: 'success', date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    const monthlyRevenue = monthlyRevenueAgg.map(m => ({ month: m._id, amount: m.amount }));

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenueThisYear,
        monthlyRevenue,
        byType,
        comparison: {
          thisYear: totalRevenueThisYear,
          lastYear: totalRevenueLastYear,
          growth: growth.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPendingPayouts = async (req, res) => {
  try {
    // Mocking payouts data as it wasn't clearly defined in models
    res.status(200).json({
      success: true,
      data: {
        payouts: [
          {
            id: "payout123",
            gymId: "gym123",
            gymName: "YC's Gym",
            amount: 450000,
            dueDate: new Date().toISOString(),
            status: "pending"
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.processPayout = async (req, res) => {
  try {
    // Mock processing
    const { processedDate } = req.body;
    
    await ActivityLog.create({
      type: 'payout_processed',
      adminId: req.admin._id,
      description: `Payout ${req.params.payoutId} processed.`
    });

    res.status(200).json({
      success: true,
      message: "Payout processed",
      payout: { id: req.params.payoutId, status: "processed", processedDate }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
