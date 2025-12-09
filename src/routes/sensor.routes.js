const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

router.get('/latest', sensorController.getLatestSensorData);
router.get('/history', sensorController.getSensorHistory);
router.get('/', sensorController.getAllSensors);
router.delete('/cleanup', sensorController.cleanupOldData);

module.exports = router;