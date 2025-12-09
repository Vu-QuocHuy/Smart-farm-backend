const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'login', 'logout', 'register_user', 'change_password',
      // Device control
      'control_device', 'view_device_status',
      // Sensor
      'view_sensor_data',
      // Alert
      'view_alerts', 'mark_alert_read',
      // Schedule
      'create_schedule', 'update_schedule', 'delete_schedule', 'view_schedule',
      // Threshold
      'create_threshold', 'update_threshold', 'delete_threshold',
      // System
      'view_activity_logs', 'export_data'
    ]
  },
  resourceType: {
    type: String,
    enum: ['user', 'device', 'sensor', 'alert', 'schedule', 'threshold', 'system'],
    required: false
  },
  resourceId: {
    type: String, // ID của tài nguyên bị tác động
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Lưu thông tin chi tiết
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index để query nhanh
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ status: 1, createdAt: -1 });

// TTL index - Tự động xóa log sau 90 ngày
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 ngày

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
