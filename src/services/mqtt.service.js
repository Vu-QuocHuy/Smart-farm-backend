const mqtt = require("../config/mqtt");
const SensorData = require("../models/SensorData");
const DeviceControl = require("../models/DeviceControl");
const Alert = require("../models/Alert");
const Threshold = require("../models/Threshold");
const ESP32Status = require("../models/ESP32Status");

class MQTTService {
  constructor() {
    this.topicPrefix = process.env.MQTT_TOPIC_PREFIX || "farm";
  }

  publishRawCommand(deviceName, payload) {
    const topic = `${this.topicPrefix}/control/${deviceName}`;
    mqtt.publish(topic, payload);
    console.log(`Published raw command: ${deviceName} -> ${payload}`);
  }

  async controlDeviceIfChanged(
    deviceName,
    status,
    controlledBy = "auto",
    value = 0
  ) {
    const last = await DeviceControl.findOne({ deviceName }).sort({
      createdAt: -1,
    });
    if (last && last.status === status) {
      return;
    }
    await this.controlDevice(deviceName, status, controlledBy, value);
  }

  // Khởi động MQTT service
  start() {
    console.log("Starting MQTT Service...");

    // Kết nối MQTT
    mqtt.connect();

    // Publish thresholds ngay sau khi MQTT kết nối thành công
    mqtt.client?.on("connect", () => {
      this.publishThresholds().catch((err) =>
        console.error("Publish thresholds error:", err)
      );
    });

    // Subscribe các topics từ ESP32
    this.subscribeToSensorTopics();
    this.subscribeToStatusTopics();

    // Xử lý messages
    this.handleMessages();
  }

  async publishThresholds() {
    try {
      const thresholds = await Threshold.find({ isActive: true });
      const payload = thresholds.map((t) => ({
        sensorType: t.sensorType,
        thresholdValue: t.thresholdValue,
        severity: t.severity,
      }));
      const topic = `${this.topicPrefix}/config/thresholds`;
      const payloadStr = JSON.stringify(payload);

      // Publish với retained flag để ESP32 nhận được ngay khi kết nối
      mqtt.publish(topic, payloadStr, { retain: true });

      console.log("Published thresholds to MQTT (retained):");
      console.log(`  Topic: ${topic}`);
      console.log(`  Payload: ${payloadStr}`);
      console.log(`  Count: ${thresholds.length} active thresholds`);
    } catch (err) {
      console.error("Failed to publish thresholds:", err);
    }
  }

  // Subscribe topics cảm biến
  subscribeToSensorTopics() {
    const sensorTopics = [
      `${this.topicPrefix}/sensors/temperature`,
      `${this.topicPrefix}/sensors/humidity`,
      `${this.topicPrefix}/sensors/soil_moisture`,
      `${this.topicPrefix}/sensors/water_level`,
      `${this.topicPrefix}/sensors/light`,
    ];

    sensorTopics.forEach((topic) => {
      mqtt.subscribe(topic);
    });
  }

  // Subscribe topics trạng thái
  subscribeToStatusTopics() {
    const statusTopics = [
      `${this.topicPrefix}/status/pump`,
      `${this.topicPrefix}/status/fan`,
      `${this.topicPrefix}/status/light`,
      `${this.topicPrefix}/status/led_farm`,
      `${this.topicPrefix}/status/led_animal`,
      `${this.topicPrefix}/status/led_hallway`,
      `${this.topicPrefix}/status/connection`,
      `${this.topicPrefix}/status/request_thresholds`,
      `${this.topicPrefix}/status/heartbeat`,
      `${this.topicPrefix}/status/lwt`,
    ];

    statusTopics.forEach((topic) => {
      mqtt.subscribe(topic);
    });
  }

  // Xử lý messages nhận được
  handleMessages() {
    mqtt.client.on("message", async (topic, message, packet) => {
      try {
        const payload = message.toString();

        // Log chi tiết dữ liệu MQTT nhận được từ broker
        console.log("MQTT message received from broker:", {
          topic,
          payload,
        });

        // Xử lý theo topic
        if (topic.includes("/sensors/")) {
          await this.handleSensorData(topic, payload);
        } else if (topic.includes("/status/")) {
          if (topic.endsWith("/request_thresholds")) {
            await this.publishThresholds();
          } else if (topic.endsWith("/heartbeat")) {
            await this.handleHeartbeat(payload);
          } else if (topic.endsWith("/lwt")) {
            await this.handleLWT(payload, { retained: !!packet?.retain });
          } else {
            await this.handleStatusUpdate(topic, payload);
          }
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });
  }

  // Xử lý dữ liệu cảm biến
  async handleSensorData(topic, payload) {
    try {
      // Parse sensor type từ topic
      // Ví dụ: farm/sensors/temperature -> temperature
      const sensorType = topic.split("/").pop();

      // Cố gắng parse JSON nếu ESP gửi dạng JSON, fallback sang parseFloat
      let value;
      let parsed;
      try {
        parsed = JSON.parse(payload);
        // Ưu tiên trường "value" nếu có, nếu không thì lấy số đầu tiên
        if (parsed && typeof parsed.value !== "undefined") {
          value = parseFloat(parsed.value);
        } else {
          value = parseFloat(payload);
        }
      } catch {
        value = parseFloat(payload);
      }

      console.log("MQTT sensor data after parse:", {
        topic,
        sensorType,
        value,
        rawPayload: payload,
      });

      // Xác định đơn vị
      const unitMap = {
        temperature: "°C",
        humidity: "%",
        soil_moisture: "%",
        water_level: "cm",
        light: "%",
      };

      // Lưu vào database
      const sensorData = await SensorData.create({
        sensorType,
        value,
        unit: unitMap[sensorType],
      });

      console.log(
        `Saved sensor data: ${sensorType} = ${value}${unitMap[sensorType]}`
      );

      // Kiểm tra ngưỡng và tạo cảnh báo
      await this.checkThresholdsAndAlert(sensorType, value);

      // Logic tự động
      await this.autoControl(sensorType, value);
    } catch (error) {
      console.error("Error handling sensor data:", error);
    }
  }

  // Xử lý trạng thái thiết bị
  async handleStatusUpdate(topic, payload) {
    try {
      const deviceName = topic.split("/").pop(); // pump, connection...

      console.log(`Status update: ${deviceName} -> ${payload}`);
      // NOTE:
      // Không ghi trạng thái runtime (ON/OFF) từ ESP32 vào DeviceControl.
      // DeviceControl dùng để lưu MODE điều khiển (AUTO vs manual) và lịch sử lệnh.
      // Nếu ghi đè bằng runtime ON/OFF, sẽ làm hỏng logic "manual override" và schedule.
    } catch (error) {
      console.error("Error handling status:", error);
    }
  }

  // Xử lý heartbeat từ ESP32
  async handleHeartbeat(payload) {
    try {
      const data = JSON.parse(payload);
      const deviceId = data.deviceId || "esp32_main";
      const ipAddress = data.ip || null;

      // Cập nhật hoặc tạo mới ESP32Status
      await ESP32Status.findOneAndUpdate(
        { deviceId },
        {
          status: "online",
          lastSeen: new Date(),
          ipAddress: ipAddress,
        },
        { upsert: true, new: true }
      );

      console.log(
        `[Heartbeat] ESP32 (${deviceId}) is online - IP: ${ipAddress}`
      );
    } catch (error) {
      console.error("Error handling heartbeat:", error);
    }
  }

  // Xử lý Last Will and Testament (LWT) - ESP32 mất kết nối
  async handleLWT(payload, { retained } = {}) {
    try {
      const data = JSON.parse(payload);
      const deviceId = data.deviceId || "esp32_main";

      await ESP32Status.findOneAndUpdate(
        { deviceId },
        { status: "offline" },
        { upsert: true, new: true }
      );

      console.log(`[LWT] ESP32 (${deviceId}) went offline`);

      // Khi backend vừa subscribe, broker có thể gửi retained LWT (offline) từ lần trước.
      // Trường hợp này chỉ nên cập nhật trạng thái, tránh tạo cảnh báo sai/spam.
      if (retained) {
        console.log(
          `[LWT] Ignored retained offline LWT for deviceId=${deviceId} (startup/subscription replay)`
        );
        return;
      }

      // Tránh tạo trùng alert nếu đã có 1 alert mất kết nối đang active
      const existing = await Alert.findOne({
        type: "connection_lost",
        status: "active",
        "data.deviceId": deviceId,
      });

      if (existing) {
        return;
      }

      // Tạo alert cảnh báo mất kết nối
      await Alert.create({
        type: "connection_lost",
        severity: "critical",
        title: "Mất kết nối ESP32",
        message: `Thiết bị ESP32 (${deviceId}) đã mất kết nối`,
        status: "active",
        data: {
          deviceId,
          source: "lwt",
        },
      });
    } catch (error) {
      console.error("Error handling LWT:", error);
    }
  }

  // Kiểm tra ngưỡng và tạo cảnh báo (dùng ngưỡng từ DB)
  async checkThresholdsAndAlert(sensorType, value) {
    try {
      // Lấy ngưỡng từ database
      const threshold = await Threshold.findOne({
        sensorType,
        isActive: true,
      });

      if (!threshold) {
        // Không có ngưỡng được cài đặt cho sensor này
        return;
      }

      let alertType = null;
      let shouldCreateAlert = false;
      let shouldResolveAlert = false;

      // Với mô hình mới: mỗi sensorType chỉ có 1 thresholdValue
      // soil_moisture, light: thấp hơn ngưỡng -> cảnh báo
      // temperature: cao hơn ngưỡng -> cảnh báo
      if (sensorType === "soil_moisture") {
        alertType = `low_${sensorType}`;
        if (value < threshold.thresholdValue) {
          shouldCreateAlert = true;
        } else {
          shouldResolveAlert = true;
        }
      } else if (sensorType === "light") {
        alertType = `low_${sensorType}`;
        if (value < threshold.thresholdValue) {
          shouldCreateAlert = true;
        } else {
          shouldResolveAlert = true;
        }
      } else if (sensorType === "temperature") {
        alertType = `high_${sensorType}`;
        if (value > threshold.thresholdValue) {
          shouldCreateAlert = true;
        } else {
          shouldResolveAlert = true;
        }
      }

      // Kiểm tra xem đã có alert active với type này chưa
      const existingAlert = await Alert.findOne({
        type: alertType,
        status: "active",
      });

      // Tạo alert mới nếu vượt ngưỡng và chưa có alert active
      if (shouldCreateAlert && !existingAlert) {
        let alertTitle = "";
        let alertMessage = "";

        if (sensorType === "soil_moisture") {
          alertTitle = "Độ ẩm đất thấp";
          alertMessage = `Độ ẩm đất hiện tại ${value}, thấp hơn ngưỡng ${threshold.thresholdValue}`;
        } else if (sensorType === "light") {
          alertTitle = "Ánh sáng yếu";
          alertMessage = `Ánh sáng hiện tại ${value}, thấp hơn ngưỡng ${threshold.thresholdValue}`;
        } else if (sensorType === "temperature") {
          alertTitle = "Nhiệt độ cao";
          alertMessage = `Nhiệt độ hiện tại ${value}, vượt ngưỡng ${threshold.thresholdValue}`;
        }

        const alert = await Alert.create({
          type: alertType,
          severity: threshold.severity,
          title: alertTitle,
          message: alertMessage,
          status: "active",
        });

        console.log(`Alert created: ${alertTitle}`);

        // Publish alert lên MQTT cho app
        this.publishAlert(alert);
      }

      // Tự động resolve alert nếu giá trị về mức an toàn
      if (shouldResolveAlert && existingAlert) {
        // Chỉ cập nhật trạng thái, không thay đổi message
        existingAlert.status = "resolved";
        existingAlert.autoResolved = true;
        existingAlert.resolvedAt = new Date();
        await existingAlert.save();

        console.log(`Alert auto-resolved: ${existingAlert.title}`);

        // Publish alert resolved lên MQTT cho app
        this.publishAlert(existingAlert);
      }
    } catch (error) {
      console.error("Error checking thresholds:", error);
    }
  }

  // Logic tự động
  async autoControl(sensorType, value) {
    try {
      // Mặc định để ESP32 tự xử lý auto-control (phản ứng nhanh hơn).
      // Chỉ bật auto-control phía backend nếu set env AUTO_CONTROL_MODE=backend
      const mode = process.env.AUTO_CONTROL_MODE || "esp32";
      if (mode !== "backend") {
        return;
      }

      // Lấy threshold tương ứng (nếu có bật)
      const threshold = await Threshold.findOne({
        sensorType,
        isActive: true,
      });

      if (!threshold) {
        return;
      }

      // Độ ẩm đất thấp hơn ngưỡng -> bật bơm, ngược lại -> tắt bơm
      if (sensorType === "soil_moisture") {
        if (value < threshold.thresholdValue) {
          console.log("Độ ẩm đất thấp hơn ngưỡng, tự động bật bơm...");
          await this.controlDeviceIfChanged("pump", "ON", "auto");
        } else {
          await this.controlDeviceIfChanged("pump", "OFF", "auto");
        }
      }

      // Ánh sáng thấp hơn ngưỡng -> bật đèn khu trồng trọt, ngược lại -> tắt
      if (sensorType === "light") {
        if (value < threshold.thresholdValue) {
          console.log("Ánh sáng thấp hơn ngưỡng, tự động bật đèn...");
          await this.controlDeviceIfChanged("led_farm", "ON", "auto");
        } else {
          await this.controlDeviceIfChanged("led_farm", "OFF", "auto");
        }
      }

      // Nhiệt độ cao hơn ngưỡng -> bật quạt, ngược lại -> tắt quạt
      if (sensorType === "temperature") {
        if (value > threshold.thresholdValue) {
          console.log("Nhiệt độ cao hơn ngưỡng, tự động bật quạt...");
          await this.controlDeviceIfChanged("fan", "ON", "auto");
        } else {
          await this.controlDeviceIfChanged("fan", "OFF", "auto");
        }
      }
    } catch (error) {
      console.error("Error in auto control:", error);
    }
  }

  // Điều khiển thiết bị
  async controlDevice(deviceName, status, controlledBy = "manual", value = 0) {
    try {
      // Kiểm tra ESP32 còn online không (nếu là user hoặc schedule)
      if (controlledBy === "manual" || controlledBy === "schedule") {
        const esp32Status = await ESP32Status.findOne({
          deviceId: "esp32_main",
        });
        if (!esp32Status || !esp32Status.isOnline()) {
          console.warn(
            `[Control] ESP32 is offline, cannot control ${deviceName}`
          );
          throw new Error("ESP32 đang offline, không thể điều khiển thiết bị");
        }
      }

      const isServoAction =
        deviceName === "servo_door" || deviceName === "servo_feed";

      // Servo là "action":
      // - AUTO/OFF dùng để bật/tắt chế độ cho phép lịch trình (auto)
      // - ON dùng để RUN 1 chu kỳ, không thay đổi trạng thái AUTO/OFF đang có
      let storedStatus = status;
      let commandPayload = status;

      if (isServoAction) {
        if (status === "AUTO") {
          storedStatus = "AUTO";
          commandPayload = "AUTO";
        } else if (status === "OFF") {
          storedStatus = "OFF";
          commandPayload = "OFF";
        } else if (status === "ON") {
          // RUN 1 lần, giữ nguyên mode hiện tại (AUTO/OFF)
          const last = await DeviceControl.findOne({ deviceName }).sort({
            createdAt: -1,
          });
          storedStatus = last?.status || "OFF";
          commandPayload = "RUN";
        }
      }

      // Lưu vào database
      await DeviceControl.create({
        deviceName: deviceName,
        status: storedStatus,
        controlledBy,
        value: value || 0,
      });

      // Publish lệnh xuống ESP32
      const topic = `${this.topicPrefix}/control/${deviceName}`;
      mqtt.publish(topic, commandPayload);

      console.log(
        `Device control: ${deviceName} -> ${commandPayload} (stored=${storedStatus}, by ${controlledBy})`
      );

      return true;
    } catch (error) {
      console.error("Error controlling device:", error);
      throw error;
    }
  }

  // Publish alert
  publishAlert(alert) {
    const topic = `${this.topicPrefix}/alerts`;
    mqtt.publish(topic, JSON.stringify(alert));
  }

  // Dừng service
  stop() {
    mqtt.disconnect();
    console.log("MQTT Service stopped");
  }
}

module.exports = new MQTTService();
