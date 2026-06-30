const mongoose = require('mongoose');
require('dotenv').config();

const HealthStore = require('./models/HealthStore');
const HealthStoreInvite = require('./models/HealthStoreInvite');

async function resetAndTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const token = '70634457dc29eb1fa89326c86e6e9b30df2cc4538657ace8936e658d2cdd7d27';
    
    // Reset invite
    const invite = await HealthStoreInvite.findOne({ inviteToken: token });
    if (invite) {
      invite.status = 'Invited';
      await invite.save();
    }

    // Reset store
    const store = await HealthStore.findOne({ inviteRef: invite._id });
    if (store) {
      store.status = 'Invited';
      await store.save();
    }
    console.log("Database reset complete.");

    // Disconnect so we don't hold the connection during fetch
    await mongoose.disconnect();

    // Now call the multipart post
    const url = `http://localhost:5000/api/health-store/register/${token}`;

    const formData = new FormData();
    formData.append('description', 'Test Description Multipart');
    formData.append('alternateMobile', '9876543210');
    formData.append('address', 'Test Address');
    formData.append('state', 'Maharashtra');
    formData.append('pincode', '400703');
    formData.append('landmark', 'Near Station');
    formData.append('gstNumber', '22AAAAA0000A1Z5');
    formData.append('fssaiLicenseNumber', '12345678901234');
    formData.append('businessRegistrationNumber', 'REG12345');
    formData.append('panNumber', 'ABCDE1234F');
    formData.append('openingTime', '09:00');
    formData.append('closingTime', '21:00');
    formData.append('deliveryAvailable', 'true');
    formData.append('deliveryRadiusKm', '10');
    formData.append('serviceAreas', 'Vashi');
    formData.append('bankName', 'ICICI Bank');
    formData.append('accountHolderName', 'Owner Name');
    formData.append('accountNumber', '1234567890');
    formData.append('ifscCode', 'ICIC0001234');
    formData.append('upiId', 'owner@icici');

    // Add dummy files
    const logoBlob = new Blob(['dummy logo content'], { type: 'image/png' });
    formData.append('logo', logoBlob, 'logo.png');

    const bannerBlob = new Blob(['dummy banner content'], { type: 'image/png' });
    formData.append('bannerImage', bannerBlob, 'banner.png');

    const docBlob = new Blob(['dummy doc content'], { type: 'application/pdf' });
    formData.append('documents', docBlob, 'doc.pdf');

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

resetAndTest();
