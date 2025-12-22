const DeviceControl = require('../models/DeviceControl');
const mqttService = require('../services/mqtt.service');

// @desc    Điều khiển thiết bị
// @route   POST /api/devices/control
// @access  Private
exports.controlDevice = async (req, res) => {
  try {
    const { deviceName, action, value } = req.body;

    // Điều khiển qua MQTT
    const result = await mqttService.controlDevice(deviceName, action, 'manual', value);

    if (result) {
      res.json({
        success: true,
        message: `Đã ${action} ${deviceName}`,
        data: { deviceName, action, value }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi điều khiển thiết bị'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Lấy trạng thái thiết bị hiện tại
// @route   GET /api/devices/status
// @access  Public
exports.getDeviceStatus = async (req, res) => {
  try {
    const devices = [
      'pump',
      'fan',
      'light',
      'servo',
      'servo1',
      'servo2',
      'led1',
      'led2',
      'led3',
    ];
    const status = {};

    for (const device of devices) {
      const latest = await DeviceControl.findOne({ deviceName: device })
        .sort({ createdAt: -1 })
        .limit(1);
      
      status[device] = latest ? latest.status : 'OFF';
    }

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy trạng thái',
      error: error.message
    });
  }
};

// @desc    Lấy lịch sử điều khiển
// @route   GET /api/devices/history?deviceName=pump&limit=50
// @access  Public
exports.getControlHistory = async (req, res) => {
  try {
    const { deviceName, limit = 50 } = req.query;

    const query = deviceName ? { deviceName } : {};

    const history = await DeviceControl.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

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