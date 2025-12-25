const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        // Admin manual alerts
        "manual_notice",
        "manual_report",
        "low_soil_moisture",
        "high_soil_moisture",
        "low_water_level",
        "high_water_level",
        "low_temperature",
        "high_temperature",
        "low_humidity",
        "high_humidity",
        "low_light",
        "high_light",
        "pump_error",
        "connection_lost",
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ["info", "warning", "critical"],
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "resolved"],
      default: "active",
    },
    title: {
      type: String,
      required: false,
    },
    data: {
      type: Map, // Dữ liệu liên quan (sensor value, threshold...)
      of: mongoose.Schema.Types.Mixed,
    },
    targetAll: {
      type: Boolean,
      default: true,
    },
    targetUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    autoResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", AlertSchema);
