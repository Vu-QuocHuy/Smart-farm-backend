exports.validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email không hợp lệ'
    });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({
      success: false,
      message: 'Username phải từ 3-30 ký tự'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password phải ít nhất 6 ký tự'
    });
  }

  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền email và password'
    });
  }

  next();
};

exports.validateDeviceControl = (req, res, next) => {
  const { deviceName } = req.body;
  let { action } = req.body;

  if (!deviceName || !action) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu deviceName hoặc action'
    });
  }

  // Chuẩn hóa action về uppercase để chấp nhận 'on'/'off'/'auto'
  action = action.toString().toUpperCase();
  req.body.action = action;

  const validActions = ['ON', 'OFF', 'AUTO'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Action phải là ON, OFF hoặc AUTO'
    });
  }

  const { value } = req.body;
  if (value !== undefined && (value < 0 || value > 255)) {
    return res.status(400).json({
      success: false,
      message: 'Value phải từ 0-255'
    });
  }

  next();
};

exports.validateSchedule = (req, res, next) => {
  const { name, deviceName, action, time } = req.body;

  if (!name || !deviceName || !action || !time) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    });
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return res.status(400).json({
      success: false,
      message: 'Time phải định dạng HH:mm (ví dụ: 08:30)'
    });
  }

  const { daysOfWeek } = req.body;
  if (daysOfWeek && Array.isArray(daysOfWeek)) {
    const invalidDays = daysOfWeek.filter(day => day < 0 || day > 6);
    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'daysOfWeek phải là các số từ 0-6'
      });
    }
  }

  next();
};

exports.validateObjectId = (req, res, next) => {
  const mongoose = require('mongoose');
  
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'ID không hợp lệ'
    });
  }

  next();
};
