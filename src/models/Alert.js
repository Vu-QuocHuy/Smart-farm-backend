const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
         enum: ['low_soil_moisture', 'low_water_level', 'high_temperature', 
           'low_temperature', 'pump_error', 'connection_lost']
    },
    severity: {
        type: String,
        required: true,
        enum: ['info', 'warning', 'critical']
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'resolved']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: false
    },
    data: {
        type: Map,  // Dữ liệu liên quan (sensor value, threshold...)
        of: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);