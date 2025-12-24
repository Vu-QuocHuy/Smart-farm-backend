const Threshold = require('../models/Threshold');

// Lấy tất cả ngưỡng cảnh báo
exports.getAllThresholds = async (req, res) => {
  try {
    const thresholds = await Threshold.find()
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ sensorType: 1 });

    res.status(200).json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Lấy ngưỡng theo loại sensor
exports.getThresholdBySensor = async (req, res) => {
  try {
    const { sensorType } = req.params;

    const threshold = await Threshold.findOne({ sensorType, isActive: true })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngưỡng cho loại cảm biến này'
      });
    }

    res.status(200).json({
      success: true,
      data: threshold
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Tạo hoặc cập nhật ngưỡng (Admin only)
exports.upsertThreshold = async (req, res) => {
  try {
    const { sensorType, thresholdValue, severity, isActive } = req.body;

    if (!sensorType || thresholdValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu sensorType hoặc thresholdValue'
      });
    }

    // Tìm và cập nhật hoặc tạo mới
    const threshold = await Threshold.findOneAndUpdate(
      { sensorType },
      {
        sensorType,
        thresholdValue,
        severity,
        isActive,
        updatedBy: req.user._id || req.user.id,
        createdBy: req.user._id || req.user.id // Chỉ set khi tạo mới
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật ngưỡng cảnh báo thành công',
      data: threshold
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Xóa ngưỡng (Admin only)
exports.deleteThreshold = async (req, res) => {
  try {
    const { sensorType } = req.params;

    const threshold = await Threshold.findOneAndDelete({ sensorType });

    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngưỡng'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa ngưỡng thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Bật/tắt ngưỡng (Admin only)
exports.toggleThreshold = async (req, res) => {
  try {
    const { sensorType } = req.params;
    const { isActive } = req.body;

    const threshold = await Threshold.findOneAndUpdate(
      { sensorType },
      { isActive, updatedBy: req.user._id || req.user.id },
      { new: true }
    );

    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ngưỡng'
      });
    }

    res.status(200).json({
      success: true,
      message: `${isActive ? 'Bật' : 'Tắt'} ngưỡng thành công`,
      data: threshold
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
