const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Lấy danh sách tất cả users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalUsers: count,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách users',
      error: error.message
    });
  }
};

// @desc    Lấy thông tin user theo ID
// @route   GET /api/users/:id
// @access  Private (Admin hoặc chính user đó)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    // Chỉ admin hoặc chính user đó mới xem được
    if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập thông tin user này'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin user',
      error: error.message
    });
  }
};

// @desc    Cập nhật thông tin user
// @route   PUT /api/users/:id
// @access  Private (Admin hoặc chính user đó)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    // Chỉ admin hoặc chính user đó mới cập nhật được
    if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật thông tin user này'
      });
    }

    // Các field được phép cập nhật
    const allowedUpdates = ['username', 'email', 'phone', 'address'];
    
    // Admin có thể cập nhật thêm role
    if (req.user.role === 'admin') {
      allowedUpdates.push('role', 'isActive');
    }

    // Lọc chỉ lấy các field được phép
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Validate username nếu có thay đổi
    if (updates.username && updates.username !== user.username) {
      // Kiểm tra username đã tồn tại chưa
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: user._id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username đã được sử dụng'
        });
      }

      // Validate độ dài username
      if (updates.username.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username phải có ít nhất 3 ký tự'
        });
      }

      if (updates.username.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username không được quá 30 ký tự'
        });
      }
    }

    // Không cho phép tự thay đổi role của chính mình
    if (updates.role && req.user.id === user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không thể tự thay đổi role của chính mình'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity - cập nhật user
    await ActivityLog.create({
      userId: req.user.id,
      action: 'update_user',
      resourceType: 'user',
      resourceId: updatedUser._id.toString(),
      details: updates,
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin user thành công',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật user',
      error: error.message
    });
  }
};

// @desc    Khóa/Mở khóa tài khoản user
// @route   PUT /api/users/:id/toggle-status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    // Không cho phép khóa chính mình
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không thể khóa tài khoản của chính mình'
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    // Log activity - khóa/mở khóa user
    await ActivityLog.create({
      userId: req.user.id,
      action: 'toggle_user_status',
      resourceType: 'user',
      resourceId: user._id.toString(),
      details: { targetUser: user.username, isActive: user.isActive },
    });

    res.json({
      success: true,
      message: `${user.isActive ? 'Mở khóa' : 'Khóa'} tài khoản thành công`,
      data: {
        userId: user._id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thay đổi trạng thái user',
      error: error.message
    });
  }
};

// @desc    Xóa user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    // Không cho phép xóa chính mình
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không thể xóa tài khoản của chính mình'
      });
    }

    await user.deleteOne();

    // Log activity - xóa user
    await ActivityLog.create({
      userId: req.user.id,
      action: 'delete_user',
      resourceType: 'user',
      resourceId: user._id.toString(),
      details: { targetUser: user.username },
    });

    res.json({
      success: true,
      message: 'Xóa user thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa user',
      error: error.message
    });
  }
};
