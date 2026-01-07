const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    middle_name: { type: String },
    last_name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // <-- ADD THIS LINE
    details: {
        collegeName: String,
        semester: String,
        year: String,
        courses: [String]
    }
});

module.exports = mongoose.model('User', userSchema);