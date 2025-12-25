const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Threshold = require('../models/Threshold');

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
      return log.details.deviceName;
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
          const threshold = await Threshold.findById(log.resourceId).select('sensorType');
          if (threshold) {
            const sensorTypeMap = {
              'temperature': 'Nhiệt độ',
              'soil_moisture': 'Độ ẩm đất',
              'light': 'Ánh sáng'
            };
            return sensorTypeMap[threshold.sensorType] || threshold.sensorType;
          }
          return log.resourceId;
        case 'device':
          // Device không có model riêng, lấy từ details hoặc resourceId
          return log.details?.deviceName || log.resourceId;
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
        logObj.resourceName = await getResourceName(logObj);
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
