const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { validateObjectId } = require('../middleware/validate.middleware');

// Tất cả routes cần authentication
router.use(authenticate);

router.get('/', alertController.getAllAlerts);
router.put('/:id/resolve', validateObjectId, alertController.resolveAlert);
router.put('/auto-resolve', alertController.autoResolveAlert);
router.post('/', requireAdmin, alertController.createAlert);
router.delete('/:id', validateObjectId, alertController.deleteAlert);

module.exports = router;