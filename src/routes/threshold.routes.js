const express = require('express');
const router = express.Router();
const thresholdController = require('../controllers/threshold.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { logActivity } = require('../middleware/activity-log.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

// User có thể XEM ngưỡng
router.get('/', thresholdController.getAllThresholds);
router.get('/:sensorType', thresholdController.getThresholdBySensor);

// CHỈ ADMIN có thể cài đặt/sửa/xóa ngưỡng
router.post('/', requireAdmin, logActivity('create_threshold', 'threshold'), thresholdController.upsertThreshold);
router.put('/:sensorType', requireAdmin, logActivity('update_threshold', 'threshold'), thresholdController.upsertThreshold);
router.delete('/:sensorType', requireAdmin, logActivity('delete_threshold', 'threshold'), thresholdController.deleteThreshold);
router.patch('/:sensorType/toggle', requireAdmin, logActivity('update_threshold', 'threshold'), thresholdController.toggleThreshold);

module.exports = router;
