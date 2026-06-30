const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createSuperAdmin = async () => {
  try {
    const adminExists = await User.findOne({
      email: process.env.SUPER_ADMIN_EMAIL,
    });

    if (adminExists) {
      console.log("✅ Super Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.SUPER_ADMIN_PASSWORD,
      10
    );

    await User.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: "superadmin",
    });

    console.log("✅ Super Admin Created Successfully");
  } catch (error) {
    console.error("❌ Error creating Super Admin:", error);
  }
};

module.exports = createSuperAdmin;