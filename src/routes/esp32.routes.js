const express = require("express");
const router = express.Router();
const esp32Controller = require("../controllers/esp32.controller");

// Public route - không cần authentication
router.get("/status", esp32Controller.getESP32Status);

module.exports = router;
