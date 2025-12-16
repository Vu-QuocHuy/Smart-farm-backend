const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginLimiter, registerLimiter } = require('../middleware/rate-limiter.middleware');
const { validateRegister, validateLogin } = require('../middleware/validate.middleware');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activity-log.middleware');

// @route   POST /api/auth/register
// @desc    Tạo user mới (chỉ Admin)
// @access  Private/Admin
router.post('/register', authenticate, requireAdmin, registerLimiter, validateRegister, logActivity('register_user', 'user'), authController.register);

// @route   POST /api/auth/login
// @desc    Đăng nhập
// @access  Public
router.post('/login', loginLimiter, validateLogin, authController.login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', authController.refreshToken);

// @route   POST /api/auth/logout
// @desc    Đăng xuất
// @access  Public
router.post('/logout', authenticate, authController.logout);

// @route   PUT /api/auth/change-password
// @desc    Đổi mật khẩu (User tự đổi)
// @access  Private
router.put('/change-password', authenticate, logActivity('change_password'), authController.changePassword);

module.exports = router;