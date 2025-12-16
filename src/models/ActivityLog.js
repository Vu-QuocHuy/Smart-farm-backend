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
      // User management
      'register_user', 'update_user', 'delete_user', 'toggle_user_status',
      // Device control
      'control_device',
      // Schedule (CRUD)
      'create_schedule', 'update_schedule', 'delete_schedule',
      // Threshold (CRUD)
      'create_threshold', 'update_threshold', 'delete_threshold',
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
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  }
}, {
  timestamps: true
});

// Index để query nhanh
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ status: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
