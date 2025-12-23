require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./src/config/database");
const mqttService = require("./src/services/mqtt.service");
const scheduleService = require("./src/services/schedule.service");
const { apiLimiter } = require("./src/middleware/rate-limiter.middleware");
const {
  handleValidationError,
  handleCastError,
  handleDuplicateKeyError,
  errorHandler,
} = require("./src/middleware/error.middleware");

// Import routes
const authRoutes = require("./src/routes/auth.routes");
const userRoutes = require("./src/routes/user.routes");
const sensorRoutes = require("./src/routes/sensor.routes");
const deviceRoutes = require("./src/routes/device.routes");
const alertRoutes = require("./src/routes/alert.routes");
const scheduleRoutes = require("./src/routes/schedule.routes");
const thresholdRoutes = require("./src/routes/threshold.routes");
const activityLogRoutes = require("./src/routes/activity-log.routes");
const esp32Routes = require("./src/routes/esp32.routes");

const app = express();

// Trust proxy - Required for Render, Heroku, AWS, etc.
app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to all API routes
app.use("/api", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/thresholds", thresholdRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/esp32", esp32Routes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware (phải để cuối cùng)
app.use(handleValidationError);
app.use(handleCastError);
app.use(handleDuplicateKeyError);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log("✓ Database connected");

    // Initialize MQTT service
    mqttService.start();
    console.log("✓ MQTT service initialized");

    // Initialize Schedule service
    scheduleService.start();
    console.log("✓ Schedule service initialized");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
      console.log(`✓ Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle shutdown gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

startServer();

module.exports = app;
