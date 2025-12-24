const ActivityLog = require('../models/ActivityLog');

// Middleware ghi log tự động
const logActivity = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Lưu response.json gốc
    const originalJson = res.json;

    // Override res.json để bắt kết quả
    res.json = function(data) {
      // Chỉ log nếu có user (đã authenticate)
      if (req.user && (req.user._id || req.user.id)) {
        const userId = req.user._id || req.user.id;
        const logData = {
          userId: userId,
          action: action,
          resourceType: resourceType,
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed'
        };

        // Lưu resourceId nếu có trong params
        if (req.params.id) {
          logData.resourceId = req.params.id;
        }

        // Lưu details từ body (loại bỏ password)
        if (req.body) {
          const { password, currentPassword, newPassword, confirmPassword, ...safeBody } = req.body;
          logData.details = safeBody;
        }

        // Tạo log bất đồng bộ (không chặn response)
        ActivityLog.create(logData).catch(err => {
          console.error('Error creating activity log:', err);
        });
      }

      // Gọi res.json gốc
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = { logActivity };
