const crypto = require('crypto');
const Membership = require('../models/Membership');
const Gym = require('../models/Gym');
const User = require('../models/User');
const { getRazorpay } = require('../utils/razorpay');

// Helper to calculate end date from duration string
const calculateEndDate = (startDate, durationStr) => {
  const date = new Date(startDate);
  if (!durationStr) {
    date.setDate(date.getDate() + 30); // Default to 30 days
    return date;
  }
  const durationClean = durationStr.trim().toLowerCase();
  const match = durationClean.match(/^(\d+)\s*(month|months|day|days|year|years|moths)/); // handled typo 'moths' from the screenshots
  if (!match) {
    date.setDate(date.getDate() + 30);
    return date;
  }
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit.startsWith('month') || unit.startsWith('moth')) {
    date.setMonth(date.getMonth() + val);
  } else if (unit.startsWith('day')) {
    date.setDate(date.getDate() + val);
  } else if (unit.startsWith('year')) {
    date.setFullYear(date.getFullYear() + val);
  }
  return date;
};

// Helper to parse duration string to months
const calculateDurationInMonths = (durationStr) => {
  if (!durationStr) return 1;
  const clean = durationStr.trim().toLowerCase();
  const match = clean.match(/^(\d+)/);
  if (match) return parseInt(match[1]);
  if (clean.includes('year')) return 12;
  if (clean.includes('month') || clean.includes('moth')) return 1;
  return 1;
};

// 1. Initiate Membership Purchase
exports.initiatePurchase = async (req, res) => {
  try {
    const { gymId, planId, planTitle, planType, pricePaid, duration, discountAmount, facilitiesIncluded } = req.body;
    const customerId = req.user._id;

    if (!gymId || !planTitle || !pricePaid || !duration) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({ success: false, message: "Gym not found" });
    }

    // Check if user has an active membership already
    const existingActive = await Membership.findOne({
      customerId,
      gymId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (existingActive) {
      return res.status(400).json({ success: false, message: "You already have an active membership at this gym." });
    }

    // Create Razorpay Order
    const razorpay = getRazorpay();
    const orderOptions = {
      amount: Math.round(Number(pricePaid) * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_mem_${Date.now()}`
    };

    const order = await razorpay.orders.create(orderOptions);

    const durationInMonths = calculateDurationInMonths(duration);

    // Save pending membership with TTL index lock (10 minutes)
    const membership = new Membership({
      customerId,
      gymId,
      planId,
      planTitle,
      planType: planType || planTitle,
      pricePaid: Number(pricePaid),
      duration,
      durationInMonths,
      discountAmount: Number(discountAmount || 0),
      facilitiesIncluded: facilitiesIncluded || ["Gym Access", "Personal Training", "Diet Plan", "Cardio"],
      orderId: order.id,
      status: 'pending',
      paymentStatus: 'pending',
      membershipStatus: 'pending',
      expireAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await membership.save();

    res.status(201).json({
      success: true,
      membershipId: membership._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Initiate membership error:", error);
    res.status(500).json({ success: false, message: "Failed to initiate membership purchase", error: error.message });
  }
};

// 2. Verify Membership Payment Signature
exports.verifyPurchase = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing signature verification details" });
    }

    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'fallback_key_secret')
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment signature verification failed" });
    }

    const membership = await Membership.findOne({ orderId: razorpay_order_id });
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership order not found" });
    }

    if (membership.status === 'active') {
      return res.status(200).json({ success: true, message: "Payment already verified, membership active" });
    }

    // Set membership duration dates
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, membership.duration);

    // Generate random sequential-like invoice number (e.g. INV-20260620-1234)
    const yyyymmdd = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${yyyymmdd}-${rand}`;

    membership.status = 'active';
    membership.membershipStatus = 'active';
    membership.paymentStatus = 'paid';
    membership.paymentMethod = 'razorpay';
    membership.invoiceNumber = invoiceNumber;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.paymentId = razorpay_payment_id;
    membership.expireAt = undefined; // Unset TTL index lock
    await membership.save();

    // Increment current members and monthly revenue of the gym
    await Gym.findByIdAndUpdate(membership.gymId, {
      $inc: { currentMembers: 1, monthlyRevenue: membership.pricePaid },
      $push: { memberships: membership._id }
    });

    res.status(200).json({
      success: true,
      message: "Membership purchased successfully and is now active!",
      membership: {
        id: membership._id,
        planTitle: membership.planTitle,
        planType: membership.planType,
        durationInMonths: membership.durationInMonths,
        discountAmount: membership.discountAmount,
        paymentStatus: membership.paymentStatus,
        paymentMethod: membership.paymentMethod,
        orderId: membership.orderId,
        paymentId: membership.paymentId,
        invoiceNumber: membership.invoiceNumber,
        membershipStatus: membership.membershipStatus,
        facilitiesIncluded: membership.facilitiesIncluded,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error("Verify membership error:", error);
    res.status(500).json({ success: false, message: "Failed to verify membership purchase", error: error.message });
  }
};

// 3. Get Gym Owner's Memberships
exports.getOwnerGymMemberships = async (req, res) => {
  try {
    const ownerId = req.owner._id;

    // Find all gyms owned by this owner
    const gyms = await Gym.find({ ownerId });
    const gymIds = gyms.map(gym => gym._id);

    // Fetch memberships matching the gymIds
    const memberships = await Membership.find({ gymId: { $in: gymIds } })
      .populate('customerId', 'name email phone')
      .populate('gymId', 'name location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: memberships
    });
  } catch (error) {
    console.error("Get owner gym memberships error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve memberships",
      error: error.message
    });
  }
};

// 4. Get My Memberships (for logged-in user's profile page)
exports.getMyMemberships = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const memberships = await Membership.find({ customerId: userId })
      .populate('gymId', 'name location phone email images heroImage')
      .sort({ createdAt: -1 });

    // Mark expired memberships
    const now = new Date();
    const result = memberships.map(m => {
      const isExpired = m.endDate && new Date(m.endDate) < now;
      const effectiveStatus = isExpired ? 'expired' : m.status;
      return {
        _id: m._id,
        gymId: m.gymId?._id,
        gymName: m.gymId?.name || 'Unknown Gym',
        gymCity: m.gymId?.location?.city || '',
        gymAddress: m.gymId?.location?.address || '',
        gymImage: m.gymId?.heroImage || (m.gymId?.images && m.gymId.images[0]) || null,
        planTitle: m.planTitle,
        planType: m.planType,
        duration: m.duration,
        durationInMonths: m.durationInMonths,
        pricePaid: m.pricePaid,
        paymentStatus: m.paymentStatus,
        paymentMethod: m.paymentMethod,
        invoiceNumber: m.invoiceNumber,
        startDate: m.startDate,
        endDate: m.endDate,
        status: effectiveStatus,
        membershipStatus: effectiveStatus,
        facilitiesIncluded: m.facilitiesIncluded || [],
        createdAt: m.createdAt
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Get my memberships error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch memberships", error: error.message });
  }
};

