# 🌾 HỆ THỐNG NÔNG TRẠI THÔNG MINH

Ứng dụng IoT điều khiển và giám sát nông trại thông minh sử dụng ESP32, Flutter, Node.js và MQTT.

## 📁 Cấu trúc dự án

```
Ung-dung-nhung/
├── backend/                    # Backend API (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── config/            # Cấu hình database, MQTT, env
│   │   ├── controllers/       # Xử lý logic API
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # MQTT service, business logic
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── utils/             # Helper functions
│   │   └── server.js          # Entry point
│   ├── package.json
│   └── .env.example
│
├── mobile/                     # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/            # Data models
│   │   ├── services/          # API service, MQTT service
│   │   ├── screens/           # UI screens
│   │   ├── widgets/           # Reusable widgets
│   │   ├── providers/         # State management (Provider/Riverpod)
│   │   └── utils/             # Constants, helpers
│   ├── pubspec.yaml
│   └── android/
│
├── esp32/                      # Code cho ESP32
│   ├── smart_farm/
│   │   ├── smart_farm.ino     # Main Arduino code
│   │   ├── config.h           # WiFi, MQTT config
│   │   ├── sensors.h          # Sensor handlers
│   │   └── actuators.h        # Device controls
│   └── libraries/             # Required libraries
│
├── docs/                       # Tài liệu
│   ├── API.md                 # API documentation
│   ├── MQTT_TOPICS.md         # MQTT topics structure
│   ├── SCHEMA.md              # Database schema
│   └── SETUP.md               # Setup instructions
│
├── HUONG_DAN_CAI_DAT.md       # Hướng dẫn cài đặt môi trường
└── README.md                   # File này
```

## 🛠️ Công nghệ sử dụng

### Backend

- **Node.js** + **Express.js** - REST API
- **MongoDB** - Database
- **MQTT.js** - MQTT client
- **JWT** - Authentication
- **Mongoose** - ODM

### Mobile

- **Flutter** - Cross-platform mobile app
- **mqtt_client** - MQTT integration
- **http/dio** - API calls
- **provider/riverpod** - State management
- **fl_chart** - Charts & graphs

### IoT

- **ESP32** - Microcontroller
- **Arduino IDE** - Development environment
- **PubSubClient** - MQTT library
- **DHT library** - Temperature/humidity sensor
- **Servo library** - Servo motor control

### Cloud Services

- **HiveMQ Cloud** - MQTT Broker (free tier)
- **MongoDB Atlas** - Cloud database (optional)

## 📋 Yêu cầu phần cứng

- ESP32 DevKit
- DHT11/DHT22 (cảm biến nhiệt độ, độ ẩm)
- Cảm biến độ ẩm đất (Soil Moisture)
- Cảm biến mực nước (Ultrasonic/Float sensor)
- Cảm biến ánh sáng (LDR/BH1750)
- Relay module (2-4 kênh)
- Bơm nước mini 5V/12V
- Quạt mini 5V
- Servo motor SG90
- Nguồn điện 5V/12V

## 🚀 Bắt đầu nhanh

### 1. Clone repository

```bash
cd d:\Ung-dung-nhung
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Cấu hình MongoDB và MQTT trong .env
npm start
```

### 3. Setup Mobile App

```bash
cd mobile
flutter pub get
flutter run
```

### 4. Setup ESP32

1. Mở Arduino IDE
2. Cài đặt ESP32 board support
3. Cài đặt libraries: PubSubClient, DHT, Servo
4. Mở `esp32/smart_farm/smart_farm.ino`
5. Cấu hình WiFi và MQTT trong `config.h`
6. Upload code lên ESP32

## 📡 MQTT Topics

```
farm/sensors/temperature        # Nhiệt độ
farm/sensors/humidity          # Độ ẩm không khí
farm/sensors/soil_moisture     # Độ ẩm đất
farm/sensors/water_level       # Mực nước
farm/sensors/light             # Cường độ ánh sáng

farm/control/pump              # Điều khiển bơm
farm/control/fan               # Điều khiển quạt
farm/control/servo             # Điều khiển servo (cho ăn)
farm/control/relay1            # Relay 1 (đèn/thiết bị khác)

farm/status/pump               # Trạng thái bơm
farm/status/connection         # Trạng thái kết nối ESP32
farm/alerts                    # Cảnh báo
```

## 🎯 Tính năng chính

### ✅ Đã triển khai

- [ ] Giám sát cảm biến real-time
- [ ] Điều khiển thiết bị từ xa
- [ ] Lưu trữ lịch sử dữ liệu
- [ ] Tưới tự động theo ngưỡng
- [ ] Lịch tưới định kỳ
- [ ] Cảnh báo qua app
- [ ] Dashboard với biểu đồ
- [ ] Cho ăn tự động (servo)
- [ ] Xuất báo cáo

### 🔄 Đang phát triển

- [ ] Dự báo thời tiết tích hợp
- [ ] AI/ML dự đoán nhu cầu tưới
- [ ] Voice control
- [ ] Multi-user support

## 📖 Tài liệu

Xem thêm tài liệu chi tiết trong thư mục `docs/`:

- [API Documentation](docs/API.md)
- [MQTT Topics](docs/MQTT_TOPICS.md)
- [Database Schema](docs/SCHEMA.md)
- [Setup Guide](docs/SETUP.md)

## 👨‍💻 Phát triển

### Backend

```bash
cd backend
npm run dev          # Development mode with nodemon
npm test            # Run tests
npm run lint        # Lint code
```

### Mobile

```bash
cd mobile
flutter run         # Run on connected device/emulator
flutter test        # Run tests
flutter build apk   # Build APK
```

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập và thương mại.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc Issue.

## 📞 Liên hệ

- Email: your-email@example.com
- GitHub: https://github.com/yourusername

---

**Made with ❤️ for Smart Farming**
