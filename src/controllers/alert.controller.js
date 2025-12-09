const Alert = require('../models/Alert');

// @desc    Lấy tất cả cảnh báo
// @route   GET /api/alerts?status=active&limit=50
// @access  Public
exports.getAllAlerts = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    const query = status ? { status } : {};

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy cảnh báo',
      error: error.message
    });
  }
};

// @desc    Lấy cảnh báo chưa đọc
// @route   GET /api/alerts/unread
// @access  Public
exports.getUnreadAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ isRead: false })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy cảnh báo',
      error: error.message
    });
  }
};

// @desc    Đánh dấu đã đọc
// @route   PUT /api/alerts/:id/read
// @access  Public
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cảnh báo'
      });
    }

    res.status(200).json({
      success: true,
      data: alert
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật',
      error: error.message
    });
  }
};

// @desc    Giải quyết cảnh báo
// @route   PUT /api/alerts/:id/resolve
// @access  Public
exports.resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cảnh báo'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã giải quyết cảnh báo',
      data: alert
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật',
      error: error.message
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
        message: 'Không tìm thấy cảnh báo'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa cảnh báo'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa',
      error: error.message
    });
  }
};