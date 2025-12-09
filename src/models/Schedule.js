const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }, 
    deviceName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/  // ← HH:mm format
    },
    daysOfWeek: {
        type: [Number],
        default: [0, 1, 2, 3, 4, 5, 6],  // 0=CN, 1=T2...
        validate: {
            validator: function(v) {
                return v.every(day => day >= 0 && day <= 6);
            },
            message: 'Ngày trong tuần phải từ 0-6'
        }
    }, 
    enabled: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

module.exports = mongoose.model('Schedule', ScheduleSchema);