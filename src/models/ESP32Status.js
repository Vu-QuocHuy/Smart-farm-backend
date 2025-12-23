const mongoose = require("mongoose");

const ESP32StatusSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      default: "esp32_main",
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Method để kiểm tra xem ESP32 có online không (trong vòng 60s)
ESP32StatusSchema.methods.isOnline = function () {
  const now = new Date();
  const diffSeconds = (now - this.lastSeen) / 1000;
  return diffSeconds < 60; // Nếu heartbeat trong 60s coi như online
};

module.exports = mongoose.model("ESP32Status", ESP32StatusSchema);
