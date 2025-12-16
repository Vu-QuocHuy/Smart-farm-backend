const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activity-log.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

// CHỈ ADMIN có thể xem tất cả log và thống kê
router.get('/', requireAdmin, activityLogController.getAllLogs);
router.get('/stats', requireAdmin, activityLogController.getActivityStats);

module.exports = router;
