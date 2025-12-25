const Alert = require("../models/Alert");

// @desc    Lấy tất cả cảnh báo
// @route   GET /api/alerts?status=active&limit=50
// @access  Public
exports.getAllAlerts = async (req, res) => {
  try {
    const { status, severity, limit = 50, page = 1 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (severity) {
      query.severity = severity;
    }
    // Filter theo đối tượng nhận: targetAll hoặc targetUsers chứa user hiện tại hoặc không có targetUsers
    const audienceFilter = {
      $or: [
        { targetAll: { $ne: false } },
        { targetUsers: req.user?._id || req.user?.id },
        { targetUsers: { $exists: false } },
      ],
    };
    const parsedLimit = parseInt(limit);
    const parsedPage = Math.max(1, parseInt(page));
    const skip = (parsedPage - 1) * parsedLimit;

    const [alerts, total] = await Promise.all([
      Alert.find({ ...query, ...audienceFilter })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Alert.countDocuments({ ...query, ...audienceFilter }),
    ]);

    res.status(200).json({
      success: true,
      count: alerts.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy cảnh báo",
      error: error.message,
    });
  }
};

// @desc    Giải quyết cảnh báo (manual)
// @route   PUT /api/alerts/:id/resolve
// @access  Public
exports.resolveAlert = async (req, res) => {
  try {
    const updateData = {
      status: "resolved",
      autoResolved: false,
      resolvedAt: new Date(),
    };

    if (req.user) {
      updateData.resolvedBy = req.user?._id || req.user?.id;
    }

    const alert = await Alert.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo",
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã giải quyết cảnh báo",
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật",
      error: error.message,
    });
  }
};

// @desc    Tự động resolve (từ cảm biến/rule) dựa trên type + deviceName
// @route   PUT /api/alerts/auto-resolve
// @access  Public (đã authenticate)
exports.autoResolveAlert = async (req, res) => {
  try {
    const { type, deviceName } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Thiếu type để auto-resolve",
      });
    }

    // Tìm alert đang active theo type (và deviceName nếu có)
    const query = { status: "active", type };
    if (deviceName) {
      query["data.deviceName"] = deviceName;
    }

    const alert = await Alert.findOneAndUpdate(
      query,
      {
        status: "resolved",
        autoResolved: true,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo active để auto-resolve",
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã auto-resolve cảnh báo",
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi auto-resolve",
      error: error.message,
    });
  }
};

// @desc    Admin tạo thông báo (broadcast hoặc chọn user)
// @route   POST /api/alerts
// @access  Admin
exports.createAlert = async (req, res) => {
  try {
    const {
      title,
      message,
      type = "manual_notice",
      severity = "info",
      targetAll = true,
      targetUsers = [],
      data = {},
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Thiếu title hoặc message",
      });
    }

    const alert = await Alert.create({
      title,
      message,
      type,
      severity,
      status: "active",
      targetAll,
      targetUsers: targetAll ? [] : targetUsers,
      data,
      createdBy: req.user?._id || req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo thông báo",
      error: error.message,
    });
  }
};

// @desc    Xóa cảnh báo
// @route   DELETE /api/alerts/:id
// @access  Private
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cảnh báo",
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã xóa cảnh báo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa",
      error: error.message,
    });
  }
};
