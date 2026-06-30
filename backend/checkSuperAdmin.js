
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

const checkSuperAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const email = 'admin@gym.com';
  const password = 'Admin@123';
  
  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found');
  } else {
    console.log('User found:', user.email, 'Role:', user.role);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
  }
  
  mongoose.disconnect();
};

checkSuperAdmin();
