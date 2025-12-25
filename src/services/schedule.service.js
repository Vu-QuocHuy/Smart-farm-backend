const cron = require("node-cron");
const Schedule = require("../models/Schedule");
const mqttService = require("./mqtt.service");

class ScheduleService {
  constructor() {
    this.cronJob = null;

    // Guards to avoid re-executing start/end multiple times within the same minute
    this._executedKeys = new Map();

    // Repeat control for servo schedules
    this._lastServoRunAt = new Map();

    // Log throttling (avoid printing the same HH:MM many times per minute)
    this._lastCheckLogTimeKey = null;

    // Config
    this._tickExpression = "*/5 * * * * *"; // every 5 seconds
    const envRepeat = parseInt(process.env.SERVO_FEED_REPEAT_MS || "5000", 10);
    // Firmware feed cycle ~4s, clamp to avoid message queue pile-up.
    this._servoFeedRepeatMs = Number.isFinite(envRepeat)
      ? Math.max(envRepeat, 4500)
      : 5000;
    this._endClearDelayMs = 1500; // delay before S_CLEAR so OFF is observable
  }

  // Khởi động schedule checker (chạy mỗi phút)
  start() {
    console.log("Starting Schedule Service...");

    // Chạy định kỳ: check schedules (cần tick nhanh để servo_feed có thể lặp liên tục)
    this.cronJob = cron.schedule(this._tickExpression, async () => {
      await this.checkAndExecuteSchedules();
    });

    console.log(
      `Schedule Service started - checking every 5 seconds (${this._tickExpression})`
    );
  }

  _dateKey(now) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  _makeTime(now) {
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  }

  _shouldExecuteOnce(scheduleId, dateKey, timeKey, phase) {
    const key = `${scheduleId}:${dateKey}:${timeKey}:${phase}`;
    if (this._executedKeys.has(key)) return false;
    this._executedKeys.set(key, Date.now());
    return true;
  }

  _cleanupExecutedKeys(maxAgeMs = 36 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [k, ts] of this._executedKeys.entries()) {
      if (now - ts > maxAgeMs) this._executedKeys.delete(k);
    }
  }

  // Kiểm tra và thực thi lịch
  async checkAndExecuteSchedules() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0=CN, 1=T2, ..., 6=T7
      const currentTime = this._makeTime(now);
      const dateKey = this._dateKey(now);

      this._cleanupExecutedKeys();

      // Lấy các lịch enabled cho ngày hiện tại
      const schedules = await Schedule.find({
        enabled: true,
        daysOfWeek: currentDay,
      });

      // Tick is every 5 seconds, but currentTime is HH:MM => log this line at most once per minute.
      if (schedules.length > 0 && this._lastCheckLogTimeKey !== currentTime) {
        this._lastCheckLogTimeKey = currentTime;
        console.log(
          `[Schedule] Checking ${schedules.length} schedule(s) at ${currentTime}`
        );
      }

      for (const schedule of schedules) {
        try {
          const isServoDoor = schedule.deviceName === "servo_door";
          const isServoFeed = schedule.deviceName === "servo_feed";
          const isServo = isServoDoor || isServoFeed;

          const inWindow =
            currentTime >= schedule.startTime && currentTime < schedule.endTime;

          // Đến thời gian bắt đầu: thực hiện action (ví dụ: ON/AUTO)
          if (currentTime === schedule.startTime) {
            if (
              this._shouldExecuteOnce(
                schedule._id.toString(),
                dateKey,
                schedule.startTime,
                "start"
              )
            ) {
              console.log(
                `[Schedule] Start: ${schedule.name} - ${schedule.deviceName} ${schedule.action}`
              );

              if (isServoDoor) {
                // Cửa ra vào (servo):
                // - Mới: hỗ trợ ON/OFF theo lịch để mở/đóng và giữ trong khung giờ (bằng S_ON/S_OFF).
                // - Cũ: nếu action=RUN thì vẫn chạy 1 lần tại startTime.
                if (schedule.action === "RUN") {
                  mqttService.publishRawCommand(schedule.deviceName, "RUN");
                } else if (schedule.action === "ON") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_ON");
                } else if (schedule.action === "OFF") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_OFF");
                } else if (schedule.action === "AUTO") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_CLEAR");
                }
              } else if (isServoFeed) {
                // Cho ăn (servo): UI dùng action=RUN (Thực hiện), lặp trong khung giờ (xử lý ở block inWindow)
                // StartTime không cần làm gì thêm.
              } else {
                // Thiết bị thường: chỉ ON/OFF (AUTO giữ để tương thích dữ liệu cũ)
                if (schedule.action === "AUTO") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_CLEAR");
                } else if (schedule.action === "ON") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_ON");
                } else if (schedule.action === "OFF") {
                  mqttService.publishRawCommand(schedule.deviceName, "S_OFF");
                }
              }

              console.log(`[Schedule] ✓ Start executed: ${schedule.name}`);
            }
          }

          // Trong khung giờ: giữ trạng thái ON/OFF theo lịch.
          // (Nếu user bật/tắt thủ công -> ESP32 sẽ rời AUTO và lịch tạm thời không còn hiệu lực.)
          // Riêng servo_feed: lặp liên tục "RUN" cho đến khi hết giờ.
          if (isServoFeed && inWindow) {
            if (schedule.action === "RUN" || schedule.action === "ON") {
              const sid = schedule._id.toString();
              const lastAt = this._lastServoRunAt.get(sid) || 0;
              const nowMs = Date.now();
              if (nowMs - lastAt >= this._servoFeedRepeatMs) {
                this._lastServoRunAt.set(sid, nowMs);
                mqttService.publishRawCommand(schedule.deviceName, "RUN");
                console.log(
                  `[Schedule] Servo feed RUN (repeat): ${schedule.name} (${schedule.deviceName})`
                );
              }
            }
          }

          // Đến thời gian kết thúc: luôn tắt thiết bị
          if (currentTime === schedule.endTime) {
            // Cho ăn (servo) chỉ chạy trong khung giờ, không có OFF cuối giờ
            if (isServoFeed) continue;

            if (
              this._shouldExecuteOnce(
                schedule._id.toString(),
                dateKey,
                schedule.endTime,
                "end"
              )
            ) {
              console.log(
                `[Schedule] End: ${schedule.name} - ${schedule.deviceName} (OFF then back to AUTO)`
              );

              // Kết thúc lịch:
              // - S_OFF: tắt thiết bị và bật chế độ AUTO (trong firmware)
              // - S_CLEAR (delay): bỏ ép theo lịch, quay về tự động theo ngưỡng
              // NOTE: vẫn gửi cả khi user đã bật/tắt thủ công để đảm bảo kết thúc lịch luôn đưa về trạng thái chuẩn.
              mqttService.publishRawCommand(schedule.deviceName, "S_OFF");
              setTimeout(() => {
                mqttService.publishRawCommand(schedule.deviceName, "S_CLEAR");
              }, this._endClearDelayMs);

              console.log(
                `[Schedule] ✓ End executed (S_OFF + delayed S_CLEAR): ${schedule.name}`
              );
            }
          }
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
