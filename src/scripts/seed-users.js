require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import User model
const User = require("../models/User");

// Default password for all seed users
const DEFAULT_PASSWORD = "123@Abc";

// Seed data
const seedUsers = [
  {
    username: "admin",
    email: "admin@gmail.com",
    phone: "0123456789",
    address: "Hà Nội, Việt Nam",
    role: "admin",
    isActive: true,
  },
  {
    username: "user1",
    email: "user1@gmail.com",
    phone: "0987654321",
    address: "TP Hồ Chí Minh, Việt Nam",
    role: "user",
    isActive: true,
  },
  {
    username: "user2",
    email: "user2@gmail.com",
    phone: "0912345678",
    address: "Đà Nẵng, Việt Nam",
    role: "user",
    isActive: true,
  },
  {
    username: "user_demo",
    email: "demo@gmail.com",
    phone: "0911111111",
    address: "Demo address",
    role: "user",
    isActive: true,
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://mongo:27017/smart_farm";
    console.log(`Connecting to MongoDB: ${mongoUri}`);

    await mongoose.connect(mongoUri);
    console.log("✓ MongoDB connected");

    // Clear existing users (optional - comment out to keep existing data)
    // const deletedCount = await User.deleteMany({});
    // console.log(`Deleted ${deletedCount.deletedCount} existing users`);

    // Hash password theo cùng thuật toán bcrypt của auth/register
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const usersToInsert = seedUsers.map((user) => ({
      ...user,
      password: hashedPassword,
    }));

    // Insert seed users (insertMany không chạy pre-save hook)
    console.log("\n📝 Inserting seed users...");
    const createdUsers = await User.insertMany(usersToInsert);

    console.log(`✓ Successfully created ${createdUsers.length} users:`);
    createdUsers.forEach((user) => {
      console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
    });

    console.log("\n✅ Database seeding completed!");
    console.log("\n📌 Login credentials:");
    seedUsers.forEach((user) => {
      console.log(`  Email: ${user.email}, Password: ${DEFAULT_PASSWORD}`);
    });
  } catch (error) {
    if (error.code === 11000) {
      console.error("⚠️  Error: User already exists (duplicate unique field)");
      console.log("   To re-seed, first run: npm run seed:clear");
    } else {
      console.error("❌ Error seeding database:", error.message);
    }
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run seeding
seedDatabase();
