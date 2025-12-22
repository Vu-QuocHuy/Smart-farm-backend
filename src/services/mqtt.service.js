const mqtt = require("../config/mqtt");
const SensorData = require("../models/SensorData");
const DeviceControl = require("../models/DeviceControl");
const Alert = require("../models/Alert");
const Threshold = require("../models/Threshold");

class MQTTService {
  constructor() {
    this.topicPrefix = process.env.MQTT_TOPIC_PREFIX || "farm";
  }

  // Khởi động MQTT service
  start() {
    console.log("Starting MQTT Service...");

    // Kết nối MQTT
    mqtt.connect();

    // Subscribe các topics từ ESP32
    this.subscribeToSensorTopics();
    this.subscribeToStatusTopics();
    // Publish thresholds to devices on startup
    this.publishThresholds().catch((err) =>
      console.error("Publish thresholds error:", err)
    );

    // Xử lý messages
    this.handleMessages();
  }

  async publishThresholds() {
    try {
      const thresholds = await Threshold.find({ isActive: true });
      const payload = thresholds.map((t) => ({
        sensorType: t.sensorType,
        minValue: t.minValue,
        maxValue: t.maxValue,
        alertType: t.alertType,
        severity: t.severity,
      }));
      const topic = `${this.topicPrefix}/config/thresholds`;
      mqtt.publish(topic, JSON.stringify(payload));
      console.log("Published thresholds to MQTT");
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
      `${this.topicPrefix}/status/connection`,
    ];

    statusTopics.forEach((topic) => {
      mqtt.subscribe(topic);
    });
  }

  // Xử lý messages nhận được
  handleMessages() {
    mqtt.client.on("message", async (topic, message) => {
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
        light: "lux",
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

      // Có thể lưu vào log hoặc xử lý logic khác
      // Ví dụ: Nếu connection lost -> tạo alert
    } catch (error) {
      console.error("Error handling status:", error);
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

      let alert = null;

      // Kiểm tra ngưỡng min (giá trị thấp)
      if (
        threshold.minValue !== undefined &&
        (threshold.alertType === "low" || threshold.alertType === "both") &&
        value < threshold.minValue
      ) {
        const titleMap = {
          soil_moisture: "Độ ẩm đất thấp",
          water_level: "Mực nước thấp",
          temperature: "Nhiệt độ thấp",
          humidity: "Độ ẩm không khí thấp",
          light: "Ánh sáng yếu",
        };

        alert = {
          type: `low_${sensorType}`,
          severity: threshold.severity,
          title: titleMap[sensorType] || `${sensorType} thấp`,
          message: `${sensorType} hiện tại ${value}, thấp hơn ngưỡng ${threshold.minValue}`,
          status: "active",
        };
      }

      // Kiểm tra ngưỡng max (giá trị cao)
      if (
        threshold.maxValue !== undefined &&
        (threshold.alertType === "high" || threshold.alertType === "both") &&
        value > threshold.maxValue
      ) {
        const titleMap = {
          soil_moisture: "Độ ẩm đất cao",
          water_level: "Mực nước cao",
          temperature: "Nhiệt độ cao",
          humidity: "Độ ẩm không khí cao",
          light: "Ánh sáng mạnh",
        };

        alert = {
          type: `high_${sensorType}`,
          severity: threshold.severity,
          title: titleMap[sensorType] || `${sensorType} cao`,
          message: `${sensorType} hiện tại ${value}, vượt ngưỡng ${threshold.maxValue}`,
          status: "active",
        };
      }

      // Tạo alert nếu có
      if (alert) {
        await Alert.create(alert);
        console.log(`Alert created: ${alert.title}`);

        // Publish alert lên MQTT cho app
        this.publishAlert(alert);
      }
    } catch (error) {
      console.error("Error checking thresholds:", error);
    }
  }

  // Logic tự động
  async autoControl(sensorType, value) {
    try {
      // Tự động bật bơm nếu đất khô
      if (sensorType === "soil_moisture" && value < 30) {
        console.log("Độ ẩm đất thấp, tự động bật bơm...");
        await this.controlDevice("pump", "ON", "auto");
      }

      // Tự động bật quạt nếu nhiệt độ cao
      if (sensorType === "temperature" && value > 35) {
        console.log("Nhiệt độ cao, tự động bật quạt...");
        await this.controlDevice("fan", "ON", "auto");
      }
    } catch (error) {
      console.error("Error in auto control:", error);
    }
  }

  // Điều khiển thiết bị
  async controlDevice(deviceName, status, controlledBy = 'manual') {
    try {
      // Lưu vào database
      await DeviceControl.create({
        deviceName: dbDeviceName,
        status,
        controlledBy
      });

      // Publish lệnh xuống ESP32 using original deviceName so topics like
      // farm/control/led1 still reach the ESP devices
      const topic = `${this.topicPrefix}/control/${deviceName}`;
      mqtt.publish(topic, status);

      console.log(
        `Device control: ${deviceName} -> ${status} (saved as ${dbDeviceName}, by ${dbControlledBy})`
      );

      return true;
    } catch (error) {
      console.error("Error controlling device:", error);
      return false;
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
