const mongoose = require('mongoose');

// This schema defines a single class entry
const classSchema = new mongoose.Schema({
    time: { type: String, required: true },
    subject: { type: String, required: true },
    room: { type: String, required: true }
});

const timetableSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Each user gets only ONE timetable document
    },
    monday: [classSchema],
    tuesday: [classSchema],
    wednesday: [classSchema],
    thursday: [classSchema],
    friday: [classSchema],
    saturday: [classSchema]
});

module.exports = mongoose.model('Timetable', timetableSchema);