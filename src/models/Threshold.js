const mongoose = require('mongoose');

const thresholdSchema = new mongoose.Schema(
  {
    sensorType: {
      type: String,
      required: true,
      // Chỉ dùng 3 loại cảm biến cho ngưỡng
      enum: ["temperature", "soil_moisture", "light"],
      unique: true, // Mỗi loại sensor chỉ có 1 ngưỡng
    },
    // Một giá trị ngưỡng duy nhất
    thresholdValue: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index để truy vấn nhanh theo sensorType
thresholdSchema.index({ sensorType: 1, isActive: 1 });

const Threshold = mongoose.model('Threshold', thresholdSchema);

module.exports = Threshold;
