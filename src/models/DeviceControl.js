const mongoose = require('mongoose');

const DeviceControlSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
        enum: [
            'pump',
            'fan',
            'light',
            'servo',
            'servo1',
            'servo2',
            'led1',
            'led2',
            'led3',
        ]
    },
    status: {
        type: String,
        required: true,
        enum: ['ON', 'OFF', 'AUTO']
    }, 
    controlledBy: {
        type: String,
        required: true,
        enum: ['user', 'auto', 'schedule']
    }, 
    value: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('DeviceControl', DeviceControlSchema);