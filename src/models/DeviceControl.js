const mongoose = require('mongoose');

const DeviceControlSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
        enum: ['pump', 'fan', 'servo', 'light']
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