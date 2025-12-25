const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Threshold = require('../models/Threshold');

// Mapping tên thiết bị sang tiếng Việt
const deviceNameMap = {
  'pump': 'Bơm nước',
  'fan': 'Quạt',
  'light': 'Đèn (Tất cả)',
  'servo_door': 'Cửa ra vào (Servo)',
  'servo_feed': 'Cho ăn (Servo)',
  'led_farm': 'Đèn trồng cây',
  'led_animal': 'Đèn khu vật nuôi',
  'led_hallway': 'Đèn hành lang'
};

// Helper function để map tên thiết bị sang tiếng Việt
const getDeviceNameInVietnamese = (deviceName) => {
  return deviceNameMap[deviceName] || deviceName;
};

// Helper function để lấy tên đối tượng
const getResourceName = async (log) => {
  // Nếu có tên trong details, ưu tiên sử dụng
  if (log.details) {
    if (log.resourceType === 'user' && log.details.username) {
      return log.details.username;
    }
    if (log.resourceType === 'schedule' && log.details.name) {
      return log.details.name;
    }
    if (log.resourceType === 'device' && log.details.deviceName) {
      return getDeviceNameInVietnamese(log.details.deviceName);
    }
    if (log.resourceType === 'threshold' && log.details.sensorType) {
      const sensorTypeMap = {
        'temperature': 'Nhiệt độ',
        'soil_moisture': 'Độ ẩm đất',
        'light': 'Ánh sáng'
      };
      return sensorTypeMap[log.details.sensorType] || log.details.sensorType;
    }
  }

  // Nếu không có trong details, fetch từ database
  if (log.resourceId) {
    try {
      switch (log.resourceType) {
        case 'user':
          const user = await User.findById(log.resourceId).select('username email');
          return user ? user.username : log.resourceId;
        case 'schedule':
          const schedule = await Schedule.findById(log.resourceId).select('name');
          return schedule ? schedule.name : log.resourceId;
        case 'threshold':
          // Threshold có thể có resourceId là sensorType (string) hoặc ObjectId
          // Thử tìm theo sensorType trước (vì route dùng sensorType làm param)
          const sensorTypeMap = {
            'temperature': 'Nhiệt độ',
            'soil_moisture': 'Độ ẩm đất',
            'light': 'Ánh sáng'
          };
          
          // Nếu resourceId là một sensorType hợp lệ
          if (sensorTypeMap[log.resourceId]) {
            return sensorTypeMap[log.resourceId];
          }
          
          // Thử tìm theo ObjectId
          try {
            const threshold = await Threshold.findById(log.resourceId).select('sensorType');
            if (threshold) {
              return sensorTypeMap[threshold.sensorType] || threshold.sensorType;
            }
          } catch (error) {
            // Không phải ObjectId hợp lệ, có thể là sensorType string
            // Đã xử lý ở trên
          }
          
          // Fallback: thử tìm theo sensorType trong collection
          const thresholdByType = await Threshold.findOne({ sensorType: log.resourceId }).select('sensorType');
          if (thresholdByType) {
            return sensorTypeMap[thresholdByType.sensorType] || thresholdByType.sensorType;
          }
          
          return log.resourceId;
        case 'device':
          // Device không có model riêng, lấy từ details hoặc resourceId
          const deviceName = log.details?.deviceName || log.resourceId;
          return getDeviceNameInVietnamese(deviceName);
        default:
          return log.resourceId;
      }
    } catch (error) {
      console.error('Error fetching resource name:', error);
      return log.resourceId;
    }
  }

  return null;
};

// Lấy tất cả log (Admin only)
exports.getAllLogs = async (req, res) => {
  try {
    const { 
      userId, 
      action, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Build filter
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('userId', 'username email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ActivityLog.countDocuments(filter)
    ]);

    // Thêm resourceName vào mỗi log
    const logsWithResourceName = await Promise.all(
      logs.map(async (log) => {
        const logObj = log.toObject();
        const resourceName = await getResourceName(logObj);
        // Nếu không tìm thấy tên, sử dụng resourceId hoặc '-'
        logObj.resourceName = resourceName || logObj.resourceId || '-';
        return logObj;
      })
    );

    res.status(200).json({
      success: true,
      data: {
        logs: logsWithResourceName,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Thống kê hoạt động (Admin only)
exports.getActivityStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const [actionStats, userStats, statusStats] = await Promise.all([
      // Thống kê theo action
      ActivityLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Thống kê theo user
      ActivityLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            username: '$user.username',
            count: 1
          }
        }
      ]),

      // Thống kê theo status
      ActivityLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        byAction: actionStats,
        byUser: userStats,
        byStatus: statusStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
