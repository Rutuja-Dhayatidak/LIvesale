const Trainer = require('../models/Trainer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendTrainerActiveEmail } = require('../utils/email');

const timeToMinutes = (timeStr) => {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const checkOverlap = (slots) => {
  const ranges = [];
  for (const slot of slots) {
    if (slot.includes('-')) {
      const parts = slot.split('-');
      const start = timeToMinutes(parts[0]);
      const end = timeToMinutes(parts[1]);
      if (start !== null && end !== null) {
        ranges.push({ start, end });
      }
    } else {
      const start = timeToMinutes(slot);
      if (start !== null) {
        ranges.push({ start, end: start + 60 });
      }
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  for (let i = 0; i < ranges.length - 1; i++) {
    if (ranges[i].end > ranges[i + 1].start) {
      return true; // Overlap detected
    }
  }
  return false;
};

exports.getTrainerProfile = async (req, res) => {
  try {
    // req.trainer comes from protectTrainer middleware
    res.status(200).json({ success: true, trainer: req.trainer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.updateTrainerProfile = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer._id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    // A trainer can only edit when approved or active
    if (trainer.status !== 'approved' && trainer.status !== 'active') {
      return res.status(403).json({ success: false, message: "You can only edit profile when approved or active" });
    }

    const {
      name, phone, dateOfBirth, gender, city,
      specializations, experience, certifications, bio, languages,
      trainingTypes, pricePerSession, pricePerMonth, availability,
      trialSession, trialPrice,
      aadharNumber, panNumber, bankAccountNumber, bankIfscCode, bankAccountHolderName,
      review, rating, clients
    } = req.body;

    // Re-validate required fields on every update
    const validateName = name !== undefined ? name : trainer.name;
    const validatePhone = phone !== undefined ? phone : trainer.phone;
    const validateCity = city !== undefined ? city : trainer.city;
    const validateBio = bio !== undefined ? bio : trainer.bio;
    const validatePrice = pricePerSession !== undefined ? Number(pricePerSession) : trainer.pricePerSession;

    if (validateName !== undefined && (!validateName || validateName.trim().length < 3)) {
      return res.status(400).json({ success: false, message: "Name is required and must be at least 3 characters" });
    }
    if (validatePhone !== undefined && (!validatePhone || validatePhone.replace(/\D/g, '').length !== 10)) {
      return res.status(400).json({ success: false, message: "Phone number is required and must be 10 digits" });
    }
    if (validateCity !== undefined && !validateCity) {
      return res.status(400).json({ success: false, message: "City is required" });
    }
    if (validateBio !== undefined && (!validateBio || validateBio.trim().length < 50)) {
      return res.status(400).json({ success: false, message: "Bio is required and must be at least 50 characters" });
    }
    if (validatePrice !== undefined && (isNaN(validatePrice) || validatePrice <= 0)) {
      return res.status(400).json({ success: false, message: "Price per session must be greater than 0" });
    }

    // Optional uploads
    const profilePhotoFile = req.files && req.files['profilePhoto'] ? req.files['profilePhoto'][0] : null;
    if (profilePhotoFile) {
      const profilePhotoUrl = await uploadToCloudinary(profilePhotoFile.buffer, 'trainers/profile');
      trainer.profilePhoto = profilePhotoUrl;
    }

    if (name) trainer.name = name;
    if (phone) trainer.phone = phone;
    if (dateOfBirth) trainer.dateOfBirth = dateOfBirth;
    if (gender) trainer.gender = gender;
    if (city) trainer.city = city;
    if (bio) trainer.bio = bio;
    if (review) trainer.review = review;
    if (clients !== undefined) trainer.clients = clients;
    if (rating) {
      if (!trainer.rating) trainer.rating = { average: 0, count: 0 };
      trainer.rating.average = Number(rating);
    }
    if (pricePerSession) trainer.pricePerSession = Number(pricePerSession);
    if (pricePerMonth) trainer.pricePerMonth = Number(pricePerMonth);
    if (trialSession !== undefined) trainer.trialSession = trialSession === 'true' || trialSession === true;
    if (trialPrice) trainer.trialPrice = Number(trialPrice);
    if (experience) trainer.experience = Number(experience);

    if (aadharNumber) {
      if (!trainer.kyc) trainer.kyc = {};
      trainer.kyc.aadharNumber = aadharNumber;
    }
    if (panNumber) {
      if (!trainer.kyc) trainer.kyc = {};
      trainer.kyc.panNumber = panNumber;
    }
    if (bankAccountNumber) {
      if (!trainer.bankAccount) trainer.bankAccount = {};
      trainer.bankAccount.accountNumber = bankAccountNumber;
    }
    if (bankIfscCode) {
      if (!trainer.bankAccount) trainer.bankAccount = {};
      trainer.bankAccount.ifscCode = bankIfscCode;
    }
    if (bankAccountHolderName) {
      if (!trainer.bankAccount) trainer.bankAccount = {};
      trainer.bankAccount.accountHolderName = bankAccountHolderName;
    }

    if (specializations) {
      trainer.specializations = Array.isArray(specializations) ? specializations : JSON.parse(specializations);
    }
    if (certifications) {
      trainer.certifications = Array.isArray(certifications) ? certifications : JSON.parse(certifications);
    }
    if (languages) {
      trainer.languages = Array.isArray(languages) ? languages : JSON.parse(languages);
    }
    if (trainingTypes) {
      trainer.trainingTypes = Array.isArray(trainingTypes) ? trainingTypes : JSON.parse(trainingTypes);
    }
    if (availability) {
      const parsedAvail = typeof availability === 'string' ? JSON.parse(availability) : availability;
      if (parsedAvail && Array.isArray(parsedAvail.timeSlots)) {
        if (checkOverlap(parsedAvail.timeSlots)) {
          return res.status(400).json({ success: false, message: "Time slots overlap. Please check your timings." });
        }
      }
      if (parsedAvail) {
        parsedAvail.timezone = parsedAvail.timezone || 'Asia/Kolkata';
      }
      trainer.availability = parsedAvail;
    }

    // Transition state from approved to active if full profile is completed
    const oldStatus = trainer.status;
    if (oldStatus === 'approved') {
      // Check if required profile setup is complete
      const isProfileComplete = trainer.name && trainer.phone && trainer.city && trainer.bio && 
                                trainer.specializations?.length > 0 && trainer.trainingTypes?.length > 0 && 
                                trainer.pricePerSession > 0;
      if (isProfileComplete) {
        trainer.status = 'active';
        trainer.activatedAt = new Date();
        trainer.statusHistory.push({
          status: 'active',
          changedByRole: 'trainer',
          reason: 'Profile setup completed',
          changedAt: new Date()
        });
        await sendTrainerActiveEmail(trainer.email, trainer.name, trainer.city);
      }
    }

    await trainer.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", trainer });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Update failed", error: error.message });
  }
};

exports.getTrainerStatus = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer._id);
    res.status(200).json({
      status: trainer.status,
      message: trainer.status === 'pending' ? "Your application is under review. We'll notify you within 48 hours." :
               trainer.status === 'approved' ? "Congratulations! You are approved. Complete your profile to go live." :
               trainer.status === 'active' ? "Your profile is live! Customers can find you." :
               trainer.status === 'rejected' ? `Application rejected. Reason: ${trainer.rejectionReason}` :
               "Account suspended. Contact support@findgym.com",
      rejectionReason: trainer.rejectionReason,
      reapplyCount: trainer.reapplyCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.reapplyTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer._id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    if (trainer.status !== 'rejected') {
      return res.status(400).json({ success: false, message: "You can only reapply if application is rejected" });
    }

    if (trainer.reapplyCount >= 3) {
      return res.status(400).json({ success: false, message: "Maximum reapply limit of 3 reached." });
    }

    // Upload new documents if provided
    const aadharCardFile = req.files && req.files['aadharCard'] ? req.files['aadharCard'][0] : null;
    const certificatesList = req.files && req.files['certificates'] ? req.files['certificates'] : [];

    if (aadharCardFile) {
      const aadharUrl = await uploadToCloudinary(aadharCardFile.buffer, 'trainers/kyc');
      trainer.kyc.aadharUrl = aadharUrl;
    }
    if (certificatesList.length > 0) {
      const certificateUrls = [];
      for (const cert of certificatesList) {
        const url = await uploadToCloudinary(cert.buffer, 'trainers/certificates');
        certificateUrls.push(url);
      }
      trainer.kyc.certificateUrls = certificateUrls;
    }

    trainer.status = 'pending';
    trainer.reapplyCount += 1;
    trainer.statusHistory.push({
      status: 'pending',
      changedByRole: 'trainer',
      reason: `Reapplication attempt ${trainer.reapplyCount}`,
      changedAt: new Date()
    });

    await trainer.save();
    res.status(200).json({ success: true, message: "Reapplication submitted successfully", newStatus: 'pending' });
  } catch (error) {
    console.error("Reapply error:", error);
    res.status(500).json({ success: false, message: "Reapply failed", error: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    if (!availability || !Array.isArray(availability.timeSlots)) {
      return res.status(400).json({ success: false, message: "Invalid availability data" });
    }

    // Check overlap
    const hasOverlap = checkOverlap(availability.timeSlots);
    if (hasOverlap) {
      return res.status(400).json({ success: false, message: "Time slots overlap. Please check your timings." });
    }

    const trainer = await Trainer.findById(req.trainer._id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    // Default timezone Asia/Kolkata
    availability.timezone = availability.timezone || 'Asia/Kolkata';

    trainer.availability = availability;
    await trainer.save();
    res.status(200).json({ success: true, message: "Availability updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Availability update failed", error: error.message });
  }
};

exports.getTrainerBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const User = require('../models/User');
    
    const bookings = await Booking.find({ trainerId: req.trainer._id })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      bookings: bookings.map(b => ({
        id: b._id,
        clientName: b.customerId?.name || "Client",
        type: b.trainingType || "Personal Training",
        date: b.date,
        time: b.slot,
        price: b.price,
        status: b.status,
        phone: b.phone || "N/A",
        address: b.address || "N/A"
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTrainerEarnings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookingsList = await Booking.find({ 
      trainerId: req.trainer._id, 
      status: { $in: ['confirmed', 'completed'] } 
    }).sort({ updatedAt: -1 });

    const totalEarnings = req.trainer.totalEarnings || 0;
    const pendingEarnings = 0; // Set appropriate pending metric

    res.status(200).json({
      success: true,
      earnings: {
        total: totalEarnings,
        pending: pendingEarnings,
        monthly: totalEarnings,
        transactions: bookingsList.map(b => ({
          id: `TX-${b._id.toString().slice(-6).toUpperCase()}`,
          bookingId: b._id,
          amount: b.price,
          type: "Payout",
          status: b.status === 'confirmed' ? "Processing" : "Completed",
          date: b.date
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
