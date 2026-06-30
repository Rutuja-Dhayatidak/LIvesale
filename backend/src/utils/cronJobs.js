const Booking = require('../models/Booking');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const { getTransporter } = require('./email');
const { getFrontendUrl } = require('./urls');

const runScheduler = () => {
  // Check slots every 5 minutes
  setInterval(async () => {
    try {
      const now = new Date();

      // 1. Fetch all confirmed bookings to scan for reminders/completions
      const bookings = await Booking.find({ status: 'confirmed' });

      for (const booking of bookings) {
        // Parse date and time (assume midday 12:00 if slot parsing isn't absolute, or build exact ISO timestamp)
        // Let's parse time format e.g. "6:00 AM" to hours and minutes
        const [timePart, ampm] = booking.slot.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

        const sessionDateTime = new Date(`${booking.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

        const diffMs = sessionDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const customer = await User.findById(booking.customerId);
        const trainer = await Trainer.findById(booking.trainerId);
        const transporter = getTransporter();

        if (customer && trainer && transporter) {
          // A. 24-Hour Reminder
          if (diffHours > 23.5 && diffHours <= 24.5 && !booking.reminderSent24h) {
            await transporter.sendMail({
              from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
              to: customer.email,
              subject: 'Session Reminder (24 Hours Remaining) - livesale.Fitness',
              text: `Hello ${customer.name},\n\nThis is a friendly reminder that you have a session booked with ${trainer.name} tomorrow at ${booking.slot}.\n\nHave a great session!`
            });
            booking.reminderSent24h = true;
            await booking.save();
          }

          // B. 1-Hour Reminder
          if (diffHours > 0.5 && diffHours <= 1.5 && !booking.reminderSent1h) {
            await transporter.sendMail({
              from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
              to: customer.email,
              subject: 'Session Starting in 1 Hour! - livesale.Fitness',
              text: `Hello ${customer.name},\n\nYour session with ${trainer.name} starts in 1 hour (at ${booking.slot}). Get ready!`
            });
            booking.reminderSent1h = true;
            await booking.save();
          }
        }

        // C. Session auto-completion (if start time is in the past by >2 hours)
        if (diffHours < -2) {
          booking.status = 'completed';
          await booking.save();

          // Payout directly (100% of price to trainer)
          if (trainer) {
            trainer.totalEarnings = (trainer.totalEarnings || 0) + booking.price;
            await trainer.save();
          }

          // Trigger review email prompt
          if (customer && trainer && transporter) {
            await transporter.sendMail({
              from: `livesale.Fitness <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
              to: customer.email,
              subject: `Rate your session with ${trainer.name}`,
              text: `Hello ${customer.name},\n\nHow was your training session with ${trainer.name}?\n\nPlease leave a review on livesale.Fitness: ${getFrontendUrl('/trainers')}`
            });
          }
        }
      }
    } catch (err) {
      console.error("Session Scheduler Error:", err);
    }
  }, 5 * 60 * 1000); // 5 minutes
};

module.exports = { runScheduler };
