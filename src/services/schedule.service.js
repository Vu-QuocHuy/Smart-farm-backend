const cron = require("node-cron");
const Schedule = require("../models/Schedule");
const mqttService = require("./mqtt.service");

class ScheduleService {
  constructor() {
    this.cronJob = null;
  }

  // Khởi động schedule checker (chạy mỗi phút)
  start() {
    console.log("Starting Schedule Service...");

    // Chạy mỗi phút: check schedules
    this.cronJob = cron.schedule("* * * * *", async () => {
      await this.checkAndExecuteSchedules();
    });

    console.log("Schedule Service started - checking every minute");
  }

  // Kiểm tra và thực thi lịch
  async checkAndExecuteSchedules() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      // Lấy các lịch enabled, có thời gian khớp và ngày trong tuần khớp
      const schedules = await Schedule.find({
        enabled: true,
        time: currentTime,
        daysOfWeek: currentDay,
      });

      if (schedules.length > 0) {
        console.log(
          `[Schedule] Found ${schedules.length} schedule(s) to execute at ${currentTime}`
        );
      }

      for (const schedule of schedules) {
        try {
          console.log(
            `[Schedule] Executing: ${schedule.name} - ${schedule.deviceName} ${schedule.action}`
          );

          // Gọi MQTT service để điều khiển thiết bị
          await mqttService.controlDevice(
            schedule.deviceName,
            schedule.action,
            "schedule"
          );

          console.log(`[Schedule] ✓ Successfully executed: ${schedule.name}`);
        } catch (error) {
          console.error(
            `[Schedule] ✗ Failed to execute ${schedule.name}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("[Schedule] Error checking schedules:", error);
    }
  }

  // Dừng service
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log("Schedule Service stopped");
    }
  }
}

module.exports = new ScheduleService();
