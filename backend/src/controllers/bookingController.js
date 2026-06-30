const crypto = require('crypto');
const Booking = require('../models/Booking');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const { getRazorpay } = require('../utils/razorpay');
const { getTransporter } = require('../utils/email');

// Helper to convert time format (e.g. "6:00 AM") to minutes since midnight
const timeToMinutes = (timeStr) => {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Send booking emails
const sendBookingConfirmationEmails = async (customer, trainer, booking) => {
  try {
    const transporter = getTransporter();

    const addressDetails = booking.address ? `\nTraining Location: ${booking.address}` : '';
    const contactPhone = booking.phone || customer.phone || 'N/A';

    // Customer Email
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: 'Booking Confirmed! - livesale.Fitness',
      text: `Hello ${customer.name},\n\nYour session with trainer ${trainer.name} has been successfully booked!\n\nDetails:\nDate: ${booking.date}\nTime Slot: ${booking.slot}\nFormat: ${booking.trainingType || 'N/A'}${addressDetails}\nPrice Paid: ₹${booking.price}\n\nTrainer Contact: ${trainer.phone}\n\nThank you for choosing livesale.Fitness!`
    });

    // Trainer Email
    await transporter.sendMail({
      from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: trainer.email,
      subject: 'New Booking Confirmed! - livesale.Fitness',
      text: `Hello ${trainer.name},\n\nYou have a new confirmed booking!\n\nDetails:\nClient Name: ${customer.name}\nDate: ${booking.date}\nTime Slot: ${booking.slot}\nFormat: ${booking.trainingType || 'N/A'}${addressDetails}\nPrice: ₹${booking.price}\n\nClient Contact: ${contactPhone}\n\nCheck your dashboard to manage sessions.`
    });
  } catch (err) {
    console.error("Failed to send booking emails:", err);
  }
};

// Helper to calculate weekly dates for next 30 days
const getMonthlyDates = (startDateStr, dayName) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  if (targetDayIndex === -1) return [startDateStr];

  const dates = [];
  const start = new Date(startDateStr);

  // Find all dates matching target day in next 28 days (4 weeks)
  for (let i = 0; i < 28; i++) {
    const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    if (current.getDay() === targetDayIndex) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  }
  return dates;
};

// 1. Initiate Booking (creates pending booking and razorpay order)
exports.initiateBooking = async (req, res) => {
  try {
    const { trainerId, slot, day, date, price, plan, trainingType, address, phone } = req.body;
    const customerId = req.user._id;

    if (!trainerId || !slot || !day || !date || !price || !phone) {
      return res.status(400).json({ success: false, message: "All fields are required (including contact phone number)" });
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    const datesToBook = plan === 'Monthly' ? getMonthlyDates(date, day) : [date];

    // Check if slot is available for all required dates
    const existingBooking = await Booking.findOne({
      trainerId,
      date: { $in: datesToBook },
      slot,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ success: false, message: "One or more of the selected slots are already booked or locked. Please choose another slot." });
    }

    // Create Razorpay Order
    const razorpay = getRazorpay();
    const orderOptions = {
      amount: Math.round(Number(price) * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(orderOptions);

    // Save bookings for all matching dates (atomically or sequentially)
    const savedBookings = [];
    for (const d of datesToBook) {
      const booking = new Booking({
        trainerId,
        customerId,
        slot,
        day,
        date: d,
        price: plan === 'Monthly' ? Number(price) / datesToBook.length : Number(price), // split price per session if monthly
        orderId: order.id,
        status: 'pending',
        trainingType,
        address,
        phone,
        expireAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min lock
      });
      await booking.save();
      savedBookings.push(booking);
    }

    res.status(201).json({
      success: true,
      bookingIds: savedBookings.map(b => b._id),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    // Check duplicate key error (race condition handler)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "This slot was just selected by another customer. Please choose a different slot." });
    }
    console.error("Initiate booking error:", error);
    res.status(500).json({ success: false, message: "Failed to initiate booking", error: error.message });
  }
};

// 2. Razorpay Webhook with Signature Verification
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'fallback_webhook_secret';

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    if (event === 'payment.captured') {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const bookings = await Booking.find({ orderId });
      if (bookings.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found for order ID' });
      }

      // Idempotency check: if already confirmed, return success
      if (bookings[0].status === 'confirmed') {
        return res.status(200).json({ success: true, message: 'Webhook already processed' });
      }

      // Unset expireAt (TTL lock release) and confirm bookings
      await Booking.updateMany(
        { orderId },
        {
          $set: { status: 'confirmed', paymentId },
          $unset: { expireAt: "" }
        }
      );

      // Increment trainer's totalEarnings immediately
      const totalAmount = bookings.reduce((sum, b) => sum + b.price, 0);
      await Trainer.findByIdAndUpdate(bookings[0].trainerId, {
        $inc: { totalEarnings: totalAmount }
      });

      // Trigger Emails for the first session of the booking batch
      const customer = await User.findById(bookings[0].customerId);
      const trainer = await Trainer.findById(bookings[0].trainerId);
      if (customer && trainer) {
        sendBookingConfirmationEmails(customer, trainer, bookings[0]).catch(err => console.error(err));
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Booking Cancellation & Refund Policy
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role; // 'member' or 'trainer'

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can be cancelled" });
    }

    const customer = await User.findById(booking.customerId);
    const trainer = await Trainer.findById(booking.trainerId);

    // Calculate time difference
    const sessionDateTime = new Date(`${booking.date}T12:00:00`); // Assume mid-day or parse slot
    const timeDiff = sessionDateTime.getTime() - Date.now();
    const hoursRemaining = timeDiff / (1000 * 60 * 60);

    const razorpay = getRazorpay();
    let refundAmount = 0;
    let refundPercent = 0;

    if (userRole === 'trainer' && userId.toString() === booking.trainerId.toString()) {
      // Trainer Cancellation: 100% refund
      refundAmount = booking.price;
      refundPercent = 100;

      // Penalize trainer
      trainer.cancellationCount = (trainer.cancellationCount || 0) + 1;
      await trainer.save();
    } else if (userId.toString() === booking.customerId.toString()) {
      // Customer Cancellation policy
      if (hoursRemaining >= 24) {
        refundAmount = booking.price;
        refundPercent = 100;
      } else {
        // Less than 24 hours: 50% refund
        refundAmount = Math.round(booking.price * 0.5);
        refundPercent = 50;
      }
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized cancellation request" });
    }

    // Call Razorpay Refund API
    if (refundAmount > 0 && booking.paymentId) {
      await razorpay.payments.refund(booking.paymentId, {
        amount: Math.round(refundAmount * 100) // in paise
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Notify cancellation via Email
    const transporter = getTransporter();
    const mailText = `Your booking on ${booking.date} at ${booking.slot} has been cancelled. Refund of ₹${refundAmount} (${refundPercent}%) initiated successfully.`;

    if (customer) {
      await transporter.sendMail({
        from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to: customer.email,
        subject: 'Booking Cancelled - livesale.Fitness',
        text: mailText
      });
    }

    res.status(200).json({
      success: true,
      message: `Booking cancelled successfully. Refund of ₹${refundAmount} (${refundPercent}%) initiated.`,
      refundAmount
    });

  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel booking", error: error.message });
  }
};

// 4. Verify Payment manually from frontend handler
exports.verifyPayment = async (req, res) => {
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

    const bookings = await Booking.find({ orderId: razorpay_order_id });
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "No bookings found matching order ID" });
    }

    if (bookings[0].status === 'confirmed') {
      return res.status(200).json({ success: true, message: "Payment already verified and booking confirmed" });
    }

    // Confirm booking batch
    await Booking.updateMany(
      { orderId: razorpay_order_id },
      {
        $set: { status: 'confirmed', paymentId: razorpay_payment_id },
        $unset: { expireAt: "" }
      }
    );

    // Increment trainer's totalEarnings immediately
    const totalAmount = bookings.reduce((sum, b) => sum + b.price, 0);
    await Trainer.findByIdAndUpdate(bookings[0].trainerId, {
      $inc: { totalEarnings: totalAmount }
    });

    // Send emails
    const customer = await User.findById(bookings[0].customerId);
    const trainer = await Trainer.findById(bookings[0].trainerId);
    if (customer && trainer) {
      sendBookingConfirmationEmails(customer, trainer, bookings[0]).catch(err => console.error(err));
    }

    res.status(200).json({ success: true, message: "Payment verified successfully, booking confirmed!" });

  } catch (error) {
    console.error("Payment manual verification error:", error);
    res.status(500).json({ success: false, message: "Verification failed", error: error.message });
  }
};
