const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validateSchedule, validateObjectId } = require('../middleware/validate.middleware');
const { logActivity } = require('../middleware/activity-log.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

// User chỉ được XEM lịch trình
router.get('/', scheduleController.getAllSchedules);

// CHỈ ADMIN mới được tạo/sửa/xóa lịch trình
router.post('/', requireAdmin, validateSchedule, logActivity('create_schedule', 'schedule'), scheduleController.createSchedule);
router.put('/:id', requireAdmin, validateObjectId, validateSchedule, logActivity('update_schedule', 'schedule'), scheduleController.updateSchedule);
router.delete('/:id', requireAdmin, validateObjectId, logActivity('delete_schedule', 'schedule'), scheduleController.deleteSchedule);
router.put('/:id/toggle', requireAdmin, validateObjectId, logActivity('update_schedule', 'schedule'), scheduleController.toggleSchedule);

module.exports = router;