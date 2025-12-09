const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateDeviceControl } = require('../middleware/validate.middleware');
const { logActivity } = require('../middleware/activity-log.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

// User được phép điều khiển thiết bị (không cần requireAdmin)
router.post('/control', validateDeviceControl, logActivity('control_device', 'device'), deviceController.controlDevice);
router.get('/status', deviceController.getDeviceStatus);
router.get('/history', deviceController.getControlHistory);

module.exports = router;