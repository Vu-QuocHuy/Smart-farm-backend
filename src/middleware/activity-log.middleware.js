const ActivityLog = require("../models/ActivityLog");

// Middleware ghi log tự động
const logActivity = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Lưu response.json gốc
    const originalJson = res.json;

    // Override res.json để bắt kết quả
    res.json = function (data) {
      // Auth middleware set req.user = User document (Mongoose)
      const userId = req.user?.userId || req.user?._id || req.user?.id;

      // Chỉ log nếu có userId (đã authenticate)
      if (userId) {
        const logData = {
          userId,
          action: action,
          resourceType: resourceType,
          status:
            res.statusCode >= 200 && res.statusCode < 300
              ? "success"
              : "failed",
        };

        // Lưu resourceId: ưu tiên từ params, sau đó từ response data (khi tạo mới)
        if (req.params.id) {
          logData.resourceId = req.params.id;
        } else if (data && data.data) {
          // Khi tạo mới (POST), ID thường nằm trong data.data._id hoặc data.data.id
          const resource = data.data;
          if (resource && (resource._id || resource.id)) {
            logData.resourceId = (resource._id || resource.id).toString();
          }
        } else if (data && (data._id || data.id)) {
          // Trường hợp response trả về trực tiếp object
          logData.resourceId = (data._id || data.id).toString();
        }

        // Lưu details từ body (loại bỏ password)
        if (req.body) {
          const {
            password,
            currentPassword,
            newPassword,
            confirmPassword,
            ...safeBody
          } = req.body;
          logData.details = safeBody;
        }

        // Tạo log bất đồng bộ (không chặn response)
        ActivityLog.create(logData).catch((err) => {
          console.error("Error creating activity log:", err);
        });
      }

      // Gọi res.json gốc
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = { logActivity };
