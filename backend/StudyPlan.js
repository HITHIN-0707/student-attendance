const mongoose = require('mongoose');

// This schema defines a single subject entry
const subjectSchema = new mongoose.Schema({
    s: { type: String, required: true }, // Subject name
    h: { type: Number, required: true }  // Hours
});

const studyPlanSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Each user gets only ONE study plan
    },
    subjects: [subjectSchema],
    examDate: { type: String } // We'll store the date as a string (e.g., "2025-12-31")
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema);