const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const User = require('./src/models/User');
    const users = await User.find({}, 'name email role');
    console.log('USERS IN DB:', users);

    const GymOwner = require('./src/models/GymOwner');
    const owners = await GymOwner.find({}, 'name email status');
    console.log('OWNERS IN DB:', owners);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
