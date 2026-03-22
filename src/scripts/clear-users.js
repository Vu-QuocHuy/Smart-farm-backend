require("dotenv").config();
const mongoose = require("mongoose");

// Import User model
const User = require("../models/User");

async function clearUsers() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://mongo:27017/smart_farm";
    console.log(`Connecting to MongoDB: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    console.log("✓ MongoDB connected");

    // Delete all users
    const deletedCount = await User.deleteMany({});
    console.log(`✓ Deleted ${deletedCount.deletedCount} users`);

    console.log("\n✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing database:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run clear
clearUsers();
