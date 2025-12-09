const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
    sensorType: {
        type: String,
        required: true,
        enum: ['temperature', 'humidity', 'soil_moisture', 'water_level', 'light']
    }, 
    value: {
        type: Number,
        required: true
    }, 
    unit: {
        type: String,
        required: true,
        enum: ['°C', '%', 'cm', 'm', 'lux']
    }
}, { timestamps: true });

module.exports = mongoose.model('SensorData', SensorDataSchema);