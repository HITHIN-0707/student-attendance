const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    date: { type: String, required: true },
    status: { type: String, required: true }, // "Present" or "Absent"
    year: { type: String, required: true },
    semester: { type: String, required: true },
    periods: { type: Number, default: 1 } // <--- NEW FIELD
});

const attendanceSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Links this to a specific user
        required: true 
    },
    course: { type: String, required: true },
    records: [attendanceRecordSchema] // A list of all records for this course
});

// Create a compound index to prevent duplicate courses for the same user
attendanceSchema.index({ userId: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);