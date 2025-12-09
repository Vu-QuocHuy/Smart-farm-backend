const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @desc    Đăng ký
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check user đã tồn tại
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email đã được sử dụng' 
          : 'Username đã được sử dụng'
      });
    }

    // Tạo user mới (password sẽ tự động hash trong model)
    const user = await User.create({ 
      username, 
      email, 
      password,
      role: role || 'user'
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user (select password vì đã set select: false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    // Check isActive
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    // Tạo Access Token (ngắn hạn)
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // 15 phút
    );

    // Tạo Refresh Token (dài hạn)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    // Lưu refresh token vào DB
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 phút = 900 giây
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu refresh token'
      });
    }

    // Kiểm tra refresh token trong DB
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ'
      });
    }

    // Kiểm tra hết hạn
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({
        success: false,
        message: 'Refresh token đã hết hạn. Vui lòng đăng nhập lại'
      });
    }

    // Lấy thông tin user
    const user = await User.findById(tokenDoc.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Tạo Access Token mới
    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: 900
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Logout (xóa refresh token)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// @desc    Đổi mật khẩu (User tự đổi)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải ít nhất 6 ký tự'
      });
    }

    // Kiểm tra mật khẩu mới và xác nhận khớp nhau
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
      });
    }

    // Lấy user từ token (req.user được set bởi authenticate middleware)
    const user = await User.findById(req.user._id).select('+password');

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Cập nhật mật khẩu mới (sẽ tự động hash trong pre-save hook)
    user.password = newPassword;
    await user.save();

    // Xóa tất cả refresh tokens cũ (bắt login lại)
    await RefreshToken.deleteMany({ userId: user._id });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};