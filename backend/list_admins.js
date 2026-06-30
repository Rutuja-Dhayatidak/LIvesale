const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const Admin = require('./src/models/Admin');
    const admins = await Admin.find({});
    console.log('ADMINS IN DB:', admins);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
