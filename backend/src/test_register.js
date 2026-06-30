const mongoose = require('mongoose');
require('dotenv').config();

const HealthStore = require('./models/HealthStore');
const HealthStoreInvite = require('./models/HealthStoreInvite');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const invite = await HealthStoreInvite.findOne().sort({ createdAt: -1 });
    if (!invite) {
      console.log("No invites found");
      return;
    }
    console.log("Invite:", invite.storeName, invite.inviteToken);

    const store = await HealthStore.findOne({ inviteRef: invite._id });
    if (!store) {
      console.log("No store found for invite");
      return;
    }
    console.log("Store status before:", store.status);

    // Let's simulate save
    store.status = 'Pending Verification';
    store.description = "Test Description";
    
    await store.save();
    console.log("Store saved successfully!");
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
