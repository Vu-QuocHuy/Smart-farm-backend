const ESP32Status = require("../models/ESP32Status");

// @desc    Lấy trạng thái ESP32
// @route   GET /api/esp32/status
// @access  Public
exports.getESP32Status = async (req, res) => {
  try {
    let status = await ESP32Status.findOne({ deviceId: "esp32_main" });

    if (!status) {
      // Tạo mới nếu chưa có
      status = await ESP32Status.create({
        deviceId: "esp32_main",
        status: "offline",
        lastSeen: new Date(0), // epoch time
      });
    }

    const isOnline = status.isOnline();
    const now = new Date();
    const lastSeenSeconds = Math.floor((now - status.lastSeen) / 1000);

    res.json({
      success: true,
      data: {
        deviceId: status.deviceId,
        status: isOnline ? "online" : "offline",
        isOnline: isOnline,
        lastSeen: status.lastSeen,
        lastSeenSeconds: lastSeenSeconds,
        ipAddress: status.ipAddress,
        updatedAt: status.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy trạng thái ESP32",
      error: error.message,
    });
  }
};
