const Schedule = require('../models/Schedule');

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
    const schedule = await Schedule.create(req.body);

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
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch'
      });
    }

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