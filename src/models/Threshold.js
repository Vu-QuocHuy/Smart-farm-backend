const mongoose = require('mongoose');

const thresholdSchema = new mongoose.Schema({
  sensorType: {
    type: String,
    required: true,
    enum: ['temperature', 'humidity', 'soil_moisture', 'water_level', 'light'],
    unique: true // Mỗi loại sensor chỉ có 1 bộ ngưỡng
  },
  minValue: {
    type: Number,
    required: false // Có thể không có ngưỡng min
  },
  maxValue: {
    type: Number,
    required: false // Có thể không có ngưỡng max
  },
  alertType: {
    type: String,
    enum: ['low', 'high', 'both'],
    default: 'both'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index để truy vấn nhanh theo sensorType
thresholdSchema.index({ sensorType: 1, isActive: 1 });

const Threshold = mongoose.model('Threshold', thresholdSchema);

module.exports = Threshold;
