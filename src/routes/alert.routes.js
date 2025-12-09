const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/validate.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

router.get('/', alertController.getAllAlerts);
router.get('/unread', alertController.getUnreadAlerts);
router.put('/:id/read', validateObjectId, alertController.markAsRead);
router.put('/:id/resolve', validateObjectId, alertController.resolveAlert);
router.delete('/:id', validateObjectId, alertController.deleteAlert);

module.exports = router;