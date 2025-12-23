const Schedule = require('../models/Schedule');

// Kiểm tra lịch trùng: cùng device, khoảng thời gian giao nhau và trùng ngày trong tuần
// Giả định: startTime < endTime, dạng HH:mm (đã được validate)
const hasScheduleConflict = async ({
  deviceName,
  startTime,
  endTime,
  daysOfWeek,
  excludeId,
}) => {
  return Schedule.findOne({
    deviceName,
    enabled: true,
    _id: { $ne: excludeId },
    daysOfWeek: { $in: daysOfWeek || [] },
    // Hai khoảng [startTime, endTime] giao nhau khi:
    // existing.startTime < newEnd && existing.endTime > newStart
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
};

// @desc    Lấy tất cả lịch
// @route   GET /api/schedules
// @access  Public
exports.getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch',
      error: error.message
    });
  }
};

// @desc    Tạo lịch mới
// @route   POST /api/schedules
// @access  Public
exports.createSchedule = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      deviceName: req.body.deviceName,
      action: req.body.action,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      daysOfWeek: req.body.daysOfWeek || [0,1,2,3,4,5,6],
      enabled: req.body.enabled !== undefined ? req.body.enabled : true,
    };

    if (payload.enabled) {
      const conflict = await hasScheduleConflict({
        deviceName: payload.deviceName,
        startTime: payload.startTime,
        endTime: payload.endTime,
        daysOfWeek: payload.daysOfWeek,
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'Thiết bị đã có lịch trùng khung giờ/ngày. Vui lòng chọn thời gian khác.'
        });
      }
    }

    const schedule = await Schedule.create(payload);

    res.status(201).json({
      success: true,
      message: 'Tạo lịch thành công',
      data: schedule
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Lỗi khi tạo lịch',
      error: error.message
    });
  }
};

// @desc    Cập nhật lịch
// @route   PUT /api/schedules/:id
// @access  Public
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch'
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const updated = {
      name: req.body.name ?? schedule.name,
      deviceName: req.body.deviceName ?? schedule.deviceName,
      action: req.body.action ?? schedule.action,
      startTime: req.body.startTime ?? schedule.startTime,
      endTime: req.body.endTime ?? schedule.endTime,
      daysOfWeek: req.body.daysOfWeek ?? schedule.daysOfWeek,
      enabled: req.body.enabled !== undefined ? req.body.enabled : schedule.enabled,
    };

    if (updated.enabled) {
      const conflict = await hasScheduleConflict({
        deviceName: updated.deviceName,
        startTime: updated.startTime,
        endTime: updated.endTime,
        daysOfWeek: updated.daysOfWeek,
        excludeId: schedule._id
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'Thiết bị đã có lịch trùng khung giờ/ngày. Vui lòng chọn thời gian khác.'
        });
      }
    }

    Object.assign(schedule, updated);
    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật lịch thành công',
      data: schedule
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật',
      error: error.message
    });
  }
};

// @desc    Xóa lịch
// @route   DELETE /api/schedules/:id
// @access  Public
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa lịch'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa',
      error: error.message
    });
  }
};

// @desc    Bật/tắt lịch
// @route   PUT /api/schedules/:id/toggle
// @access  Public
exports.toggleSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch'
      });
    }

    // Khi bật lại cần kiểm tra xung đột
    if (!schedule.enabled) {
      const conflict = await hasScheduleConflict({
        deviceName: schedule.deviceName,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        daysOfWeek: schedule.daysOfWeek,
        excludeId: schedule._id,
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'Thiết bị đã có lịch trùng khung giờ/ngày. Vui lòng chọn thời gian khác.'
        });
      }
    }

    schedule.enabled = !schedule.enabled;
    await schedule.save();

    res.status(200).json({
      success: true,
      message: `Đã ${schedule.enabled ? 'bật' : 'tắt'} lịch`,
      data: schedule
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật',
      error: error.message
    });
  }
};