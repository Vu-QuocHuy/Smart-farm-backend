const mqtt = require('mqtt');

class MQTTClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    // Format URL cho HiveMQ Cloud: mqtts://host:port
    const brokerUrl = `mqtts://${process.env.MQTT_BROKER}:${process.env.MQTT_PORT}`;
    
    const options = {
      clientId: process.env.MQTT_CLIENT_ID + '_' + Math.random().toString(16).substr(2, 8),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      console.log('MQTT Connected to broker:', process.env.MQTT_BROKER);
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT Connection error:', err);
      this.isConnected = false;
    });

    this.client.on('offline', () => {
      console.log('MQTT Client offline');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      console.log('MQTT Reconnecting...');
    });

    return this.client;
  }

  subscribe(topic, callback) {
    if (!this.client) {
      console.error('MQTT client not initialized');
      return;
    }

    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`Subscribed to topic: ${topic}`);
      }
    });

    if (callback) {
      this.client.on('message', callback);
    }
  }

  publish(topic, message, options = {}) {
    if (!this.client || !this.isConnected) {
      console.error('QTT client not connected');
      return false;
    }

    const payload = typeof message === 'object' ? JSON.stringify(message) : message.toString();

    this.client.publish(topic, payload, { qos: 1, ...options }, (err) => {
      if (err) {
        console.error(`Failed to publish to ${topic}:`, err);
      } else {
        console.log(`Published to ${topic}:`, payload);
      }
    });

    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      console.log('MQTT Client disconnected');
    }
  }
}

module.exports = new MQTTClient();