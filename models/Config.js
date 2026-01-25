// server/models/Config.js
const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    quizTime: {
        type: Number,
        default: 30,
        min: 1,
        max: 180
    },
    passingPercentage: {
        type: Number,
        default: 40,
        min: 0,
        max: 100
    },
    totalQuestions: {
        type: Number,
        default: 50,
        min: 1,
        max: 100
    },
    maxMarks: {
        type: Number,
        default: 100,
        min: 10,
        max: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt before saving
configSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Config', configSchema);