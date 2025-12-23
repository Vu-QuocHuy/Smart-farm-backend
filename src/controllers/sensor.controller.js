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
//          GET /api/sensors/history?type=temperature&days=7
//          GET /api/sensors/history?type=temperature&startDate=2025-01-01&endDate=2025-01-07
// @access  Public
exports.getSensorHistory = async (req, res) => {
  try {
    const { type, hours = 24, days, startDate, endDate } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số type'
      });
    }

    // Ưu tiên startDate/endDate -> days -> hours
    let startTime;
    let endTime = endDate ? new Date(endDate) : new Date();

    if (startDate) {
      startTime = new Date(startDate);
    } else if (days !== undefined) {
      const daysNumber = Number(days);
      if (Number.isNaN(daysNumber) || daysNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị days không hợp lệ'
        });
      }
      startTime = new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000);
    } else {
      const hoursNumber = Number(hours);
      if (Number.isNaN(hoursNumber) || hoursNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị hours không hợp lệ'
        });
      }
      startTime = new Date(Date.now() - hoursNumber * 60 * 60 * 1000);
    }

    // Validate range
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian không hợp lệ'
      });
    }

    const history = await SensorData.find({
      sensorType: type,
      createdAt: { $gte: startTime, $lte: endTime }
    })
      .sort({ createdAt: 1 })  // Sắp xếp tăng dần (cũ -> mới)
      .limit(2000);  // Giới hạn để tránh trả quá nhiều điểm

    // Calculate statistics
    let stats = {
      min: null,
      max: null,
      avg: null,
    };

    if (history.length > 0) {
      const values = history.map(item => item.value).filter(v => v != null);
      if (values.length > 0) {
        stats.min = Math.min(...values);
        stats.max = Math.max(...values);
        stats.avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
      stats: {
        min: stats.min,
        max: stats.max,
        avg: stats.avg ? parseFloat(stats.avg.toFixed(2)) : null,
      },
      range: {
        start: startTime,
        end: endTime
      }
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