const SensorData = require('../models/SensorData');

// @desc    Lấy dữ liệu cảm biến mới nhất
// @route   GET /api/sensors/latest
// @access  Public
exports.getLatestSensorData = async (req, res) => {
  try {
    // Lấy 1 record mới nhất của mỗi loại cảm biến
    const sensorTypes = ['temperature', 'humidity', 'soil_moisture', 'water_level', 'light'];
    
    const latestData = {};
    
    for (const type of sensorTypes) {
      const data = await SensorData.findOne({ sensorType: type })
        .sort({ createdAt: -1 })  // Sắp xếp giảm dần (mới nhất trước)
        .limit(1);
      
      latestData[type] = data;
    }

    res.status(200).json({
      success: true,
      data: latestData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu cảm biến',
      error: error.message
    });
  }
};

// @desc    Lấy lịch sử dữ liệu cảm biến
// @route   GET /api/sensors/history?type=temperature&hours=24
// @access  Public
exports.getSensorHistory = async (req, res) => {
  try {
    const { type, hours = 24 } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số type'
      });
    }

    // Tính thời gian bắt đầu
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const history = await SensorData.find({
      sensorType: type,
      createdAt: { $gte: startTime }
    })
      .sort({ createdAt: 1 })  // Sắp xếp tăng dần (cũ -> mới)
      .limit(1000);  // Giới hạn 1000 records

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử',
      error: error.message
    });
  }
};

// @desc    Lấy tất cả dữ liệu cảm biến (phân trang)
// @route   GET /api/sensors?page=1&limit=50
// @access  Public
exports.getAllSensors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const sensors = await SensorData.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SensorData.countDocuments();

    res.status(200).json({
      success: true,
      count: sensors.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: sensors
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu',
      error: error.message
    });
  }
};

// @desc    Xóa dữ liệu cảm biến cũ
// @route   DELETE /api/sensors/cleanup?days=90
// @access  Private (Admin)
exports.cleanupOldData = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const deleteDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await SensorData.deleteMany({
      createdAt: { $lt: deleteDate }
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} records`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa dữ liệu',
      error: error.message
    });
  }
};