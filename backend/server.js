const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('./User.js');
const Attendance = require('./Attendance.js');
const Timetable = require('./Timetable.js');
const StudyPlan = require('./StudyPlan.js');
const AuditLog = require('./AuditLog.js'); 

dotenv.config({ path: './.env' });

const app = express();
app.use(express.json({ limit: '50mb' })); 
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

// --- HELPER ---
async function logAction(adminId, action, details) {
    try {
        const admin = await User.findById(adminId);
        const log = new AuditLog({
            action,
            adminId,
            adminName: admin ? `${admin.first_name} ${admin.last_name}` : 'Unknown',
            details
        });
        await log.save();
    } catch (err) { console.error("Logging failed:", err); }
}

// --- PUBLIC ---
app.post('/api/signup', async (req, res) => {
    try {
        const { first_name, middle_name, last_name, mobile, password } = req.body;
        let user = await User.findOne({ mobile });
        if (user) return res.status(400).json({ msg: 'User already exists' });
        user = new User({ first_name, middle_name, last_name, mobile, password });
        user.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await user.save();
        res.status(201).json({ msg: 'User created successfully' });
    } catch (err) { res.status(500).send('Server error'); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const user = await User.findOne({ mobile });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
        const payload = { user: { id: user.id, mobile: user.mobile, first_name: user.first_name, last_name: user.last_name, details: user.details, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: payload.user });
        });
    } catch (err) { res.status(500).send('Server error'); }
});

function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) { res.status(400).json({ msg: 'Token invalid' }); }
}

// --- USER ROUTES ---
app.get('/api/attendance', auth, async (req, res) => {
    try { res.json(await Attendance.find({ userId: req.user.id })); } catch (err) { res.status(500).send('Server Error'); }
});

// =========================================================
// --- ATTENDANCE LOGIC (SUPPORTS SPLIT) ---
// =========================================================
app.post('/api/attendance', auth, async (req, res) => {
    const { course, date, status, year, semester, periods = 1 } = req.body;
    
    try {
        const updatedRecord = await Attendance.findOneAndUpdate(
            { 
                userId: req.user.id, 
                course: course,
                records: { 
                    $elemMatch: { date: date, year: year, semester: semester, status: status } 
                }
            },
            { $set: { "records.$.periods": periods } },
            { new: true }
        );

        if (updatedRecord) return res.status(201).json(updatedRecord);

        let attendance = await Attendance.findOne({ userId: req.user.id, course });
        if (!attendance) attendance = new Attendance({ userId: req.user.id, course, records: [] });
        
        attendance.records.push({ date, status, year, semester, periods });
        await attendance.save();
        res.status(201).json(attendance);

    } catch (err) { 
        console.error("Attendance Error:", err);
        res.status(500).send('Server Error'); 
    }
});

app.post('/api/details', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        user.details = req.body;
        await user.save();
        res.json(user.details);
    } catch (err) { res.status(500).send('Server Error'); }
});
app.get('/api/timetable', auth, async (req, res) => {
    try { res.json(await Timetable.findOne({ userId: req.user.id }) || { monday:[], tuesday:[], wednesday:[], thursday:[], friday:[], saturday:[] }); } catch (err) { res.status(500).send('Server Error'); }
});
app.post('/api/timetable', auth, async (req, res) => {
    try { res.json(await Timetable.findOneAndUpdate({ userId: req.user.id }, { ...req.body, userId: req.user.id }, { new: true, upsert: true })); } catch (err) { res.status(500).send('Server Error'); }
});
app.get('/api/studyplan', auth, async (req, res) => {
    try { res.json(await StudyPlan.findOne({ userId: req.user.id }) || { subjects:[], examDate:"" }); } catch (err) { res.status(500).send('Server Error'); }
});
app.post('/api/studyplan', auth, async (req, res) => {
    try { res.json(await StudyPlan.findOneAndUpdate({ userId: req.user.id }, { ...req.body, userId: req.user.id }, { new: true, upsert: true })); } catch (err) { res.status(500).send('Server Error'); }
});
app.get('/api/export', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ 
            userDetails: user?.details, 
            attendanceData: await Attendance.find({ userId: req.user.id }),
            timetableData: await Timetable.findOne({ userId: req.user.id }),
            studyPlanData: await StudyPlan.findOne({ userId: req.user.id })
        });
    } catch (err) { res.status(500).send('Server Error'); }
});
app.post('/api/import', auth, async (req, res) => {
    const { userDetails, attendanceData, timetableData, studyPlanData } = req.body;
    const userId = req.user.id;
    try {
        await User.findByIdAndUpdate(userId, { $set: { details: userDetails } });
        await Attendance.deleteMany({ userId });
        await Timetable.deleteMany({ userId });
        await StudyPlan.deleteMany({ userId });
        if(attendanceData?.length) await Attendance.insertMany(attendanceData.map(i => ({...i, userId, _id: undefined})));
        if(timetableData?.monday) await Timetable.create({...timetableData, userId, _id: undefined});
        if(studyPlanData?.subjects) await StudyPlan.create({...studyPlanData, userId, _id: undefined});
        const u = await User.findById(userId);
        res.json({ msg: 'Imported', user: { ...u.toObject(), id: u._id } });
    } catch (err) { res.status(500).send('Server Error'); }
});

// ==========================================
// --- ADMIN ROUTES ---
// ==========================================

function adminAuth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
        req.user = decoded.user;
        next();
    } catch (e) { res.status(400).json({ msg: 'Token invalid' }); }
}

app.get('/api/admin/all-users', adminAuth, async (req, res) => {
    try { res.json(await User.find()); } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/admin/create-user', adminAuth, async (req, res) => {
    try {
        const { first_name, last_name, mobile, password, details } = req.body;
        if (await User.findOne({ mobile })) return res.status(400).json({ msg: 'User exists' });
        const user = new User({ first_name, last_name, mobile, password, role: 'user', details });
        user.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await user.save();
        await logAction(req.user.id, "CREATE_USER", `Created: ${first_name} ${mobile}`);
        res.status(201).json({ msg: 'User created' });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.delete('/api/admin/user/:id', adminAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        if (userId === req.user.id) return res.status(400).json({ msg: 'Cannot delete self' });
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ msg: 'Not found' });
        await Attendance.deleteMany({ userId });
        await Timetable.deleteMany({ userId });
        await StudyPlan.deleteMany({ userId });
        await logAction(req.user.id, "DELETE_USER", `Deleted: ${user.first_name}`);
        res.json({ msg: 'User deleted' });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.put('/api/admin/user-role/:id', adminAuth, async (req, res) => {
    try {
        const { role } = req.body;
        if (req.params.id === req.user.id && role === 'user') return res.status(400).json({ msg: 'Cannot demote self' });
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        await logAction(req.user.id, "ROLE_CHANGE", `Role change: ${user.first_name} -> ${role}`);
        res.json(user);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.put('/api/admin/reset-password/:id', adminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ msg: "Password min 6 chars" });
        const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
        const user = await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        if (!user) return res.status(404).json({ msg: "User not found" });
        await logAction(req.user.id, "PASSWORD_RESET", `Reset password for ${user.first_name} (${user.mobile})`);
        res.json({ msg: "Password reset successfully" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// --- UPDATED: GET DETAILS (CALCULATES CURRENT SEMESTER ONLY) ---
app.get('/api/admin/user/:id/full-details', adminAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });

        const attendance = await Attendance.find({ userId: userId });
        const timetable = await Timetable.findOne({ userId: userId });
        const studyPlan = await StudyPlan.findOne({ userId: userId });

        // --- FILTER LOGIC START ---
        const currentYear = user.details?.year;
        const currentSem = user.details?.semester;

        let totalClasses = 0, presentClasses = 0;
        attendance.forEach(sub => {
            sub.records.forEach(r => {
                // STRICT CHECK: Matches Current Year & Sem ONLY
                if (String(r.year) === String(currentYear) && String(r.semester) === String(currentSem)) {
                    const periods = r.periods || 1; 
                    totalClasses += periods;
                    if (r.status === 'Present') presentClasses += periods;
                }
            });
        });
        // --- FILTER LOGIC END ---

        const attendancePercent = totalClasses === 0 ? 0 : ((presentClasses / totalClasses) * 100).toFixed(1);

        res.json({
            user, attendance, timetable, studyPlan,
            stats: { totalClasses, presentClasses, percentage: attendancePercent }
        });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/admin/logs', adminAuth, async (req, res) => {
    try { res.json(await AuditLog.find().sort({ timestamp: -1 }).limit(50)); } catch (err) { res.status(500).send('Server Error'); }
});

// --- UPDATED: AT-RISK (CALCULATES CURRENT SEMESTER ONLY) ---
app.get('/api/admin/at-risk', adminAuth, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        const list = [];
        for (const u of users) {
            // Get User's Current Profile Year/Sem
            const currentYear = u.details?.year;
            const currentSem = u.details?.semester;

            if (currentYear && currentSem) {
                const recs = await Attendance.find({ userId: u._id });
                let tot = 0, pres = 0;
                
                recs.forEach(s => s.records.forEach(r => { 
                    // STRICT CHECK: Matches Current Year & Sem ONLY
                    if (String(r.year) === String(currentYear) && String(r.semester) === String(currentSem)) {
                        const p = r.periods || 1;
                        tot += p; 
                        if(r.status === 'Present') pres += p; 
                    }
                }));

                // Only add to list if they have attendance data AND it is below 75%
                if (tot > 0 && (pres/tot) < 0.75) {
                    list.push({ 
                        id: u._id, 
                        name: u.first_name, 
                        mobile: u.mobile, 
                        college: u.details?.collegeName, 
                        percentage: ((pres/tot)*100).toFixed(1) 
                    });
                }
            }
        }
        res.json(list);
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/api/admin/backup', adminAuth, async (req, res) => {
    try {
        const data = { 
            users: await User.find(), attendance: await Attendance.find(), 
            timetables: await Timetable.find(), studyPlans: await StudyPlan.find(), 
            logs: await AuditLog.find() 
        };
        await logAction(req.user.id, "DB_BACKUP", "Backup downloaded");
        res.json({ meta: { by: req.user.first_name, date: new Date() }, data });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/api/admin/restore', adminAuth, async (req, res) => {
    try {
        const { data } = req.body;
        if (!data?.users) return res.status(400).json({ msg: "Invalid backup" });
        await User.deleteMany({}); await Attendance.deleteMany({}); 
        await Timetable.deleteMany({}); await StudyPlan.deleteMany({}); await AuditLog.deleteMany({});
        if(data.users.length) await User.insertMany(data.users);
        if(data.attendance.length) await Attendance.insertMany(data.attendance);
        if(data.timetables.length) await Timetable.insertMany(data.timetables);
        if(data.studyPlans.length) await StudyPlan.insertMany(data.studyPlans);
        if(data.logs.length) await AuditLog.insertMany(data.logs);
        await logAction(req.user.id, "DB_RESTORE", "System restored");
        res.json({ msg: "Restored successfully" });
    } catch (err) { res.status(500).send('Server Error: ' + err.message); }
});

app.get('/',(req,res)=>{
    res.send({
        activeStatus:true,
        error:false,
    })
})
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));