const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activity-log.middleware');

// @route   GET /api/users
// @desc    Lấy danh sách tất cả users (chỉ admin)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Lấy thông tin user theo ID
// @access  Private (Admin hoặc chính user đó)
router.get('/:id', protect, userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Cập nhật thông tin user
// @access  Private (Admin hoặc chính user đó)
router.put('/:id', protect, logActivity('update_user', 'user'), userController.updateUser);

// @route   PUT /api/users/:id/toggle-status
// @desc    Khóa/Mở khóa tài khoản user (chỉ admin)
// @access  Private/Admin
router.put('/:id/toggle-status', protect, authorize('admin'), logActivity('toggle_user_status', 'user'), userController.toggleUserStatus);

// @route   DELETE /api/users/:id
// @desc    Xóa user (chỉ admin)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), logActivity('delete_user', 'user'), userController.deleteUser);

module.exports = router;
