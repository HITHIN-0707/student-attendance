document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const API_URL = 'http://localhost:3000/api/admin';
    let allUsersData = [];

    if (!token || !currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    loadAllUsers();

    // --- TAB SWITCHING ---
    window.switchTab = (tabName) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        const buttons = document.querySelectorAll('.tab-btn');
        if(tabName === 'users') buttons[0].classList.add('active');
        if(tabName === 'risk') { buttons[1].classList.add('active'); loadAtRiskData(); }
        if(tabName === 'logs') { buttons[2].classList.add('active'); loadLogs(); }
    };

    // --- 1. USER MANAGEMENT ---
    async function loadAllUsers() {
        try {
            const res = await fetch(`${API_URL}/all-users`, { headers: {'x-auth-token': token} });
            const users = await res.json();
            allUsersData = users; 
            renderTable(users);
        } catch (err) { console.error(err); }
    }

    function renderTable(users) {
        let html = `<table><thead><tr><th>Full Name</th><th>Mobile</th><th>College</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
        users.forEach(u => {
            const isMe = u._id === currentUser.id;
            const details = u.details || {};
            
            // --- CONSTRUCT FULL NAME ---
            // If middle name exists, add it. Otherwise just First + Last
            const fullName = u.middle_name 
                ? `${u.first_name} ${u.middle_name} ${u.last_name}` 
                : `${u.first_name} ${u.last_name}`;

            // Make name clickable
            const nameLink = `<span class="user-link" onclick="viewUserDetails('${u._id}')">${fullName}</span>`;

            html += `<tr>
                <td>${nameLink}</td>
                <td>${u.mobile}</td>
                <td>${details.collegeName || '-'}</td>
                <td>${u.role}</td>
                <td>`;
            
            if (!isMe) {
                if (u.role === 'user') html += `<button class="btn-sm btn-promote" onclick="changeRole('${u._id}','admin')">Promote</button>`;
                if (u.role === 'admin') html += `<button class="btn-sm btn-demote" onclick="changeRole('${u._id}','user')">Demote</button>`;
                html += `<button class="btn-sm btn-reset" onclick="resetUserPassword('${u._id}')">🔑</button>`;
                html += `<button class="btn-sm btn-delete" onclick="deleteUser('${u._id}')">Delete</button>`;
            } else {
                html += `<span style="color:#888;">(You)</span>`;
            }
            html += `</td></tr>`;
        });
        html += `</tbody></table>`;
        document.getElementById('userTableContainer').innerHTML = html;
    }

    window.filterUsers = () => {
        const nameVal = document.getElementById('searchName').value.toLowerCase();
        const collegeVal = document.getElementById('searchCollege').value.toLowerCase();
        const mobileVal = document.getElementById('searchMobile').value.toLowerCase();
        const filtered = allUsersData.filter(u => {
            // Updated filter to search against full name including middle name
            const fullName = (u.middle_name ? `${u.first_name} ${u.middle_name} ${u.last_name}` : `${u.first_name} ${u.last_name}`).toLowerCase();
            const college = (u.details?.collegeName || '').toLowerCase();
            const mobile = u.mobile.toLowerCase();
            return fullName.includes(nameVal) && college.includes(collegeVal) && mobile.includes(mobileVal);
        });
        renderTable(filtered);
    };

    // --- VIEW USER DETAILS (MODAL) ---
    window.viewUserDetails = async (id) => {
        const modal = document.getElementById('userModal');
        const modalBody = document.getElementById('modalBody');
        modal.style.display = "block";
        modalBody.innerHTML = '<p style="text-align:center;">Loading user data...</p>';

        try {
            const res = await fetch(`${API_URL}/user/${id}/full-details`, { headers: { 'x-auth-token': token } });
            if (!res.ok) throw new Error("Failed to load details");
            const data = await res.json();
            const u = data.user;
            const d = u.details || {};

            // Also show full name in the modal header
            const modalFullName = u.middle_name 
                ? `${u.first_name} ${u.middle_name} ${u.last_name}` 
                : `${u.first_name} ${u.last_name}`;

            let content = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin:0;">${modalFullName}</h3>
                    <p style="color:#aaa;">${u.mobile} | Role: ${u.role.toUpperCase()}</p>
                </div>
                <div class="detail-grid">
                    <div class="detail-card">
                        <h4>🎓 Academic Profile</h4>
                        <p><strong>College:</strong> ${d.collegeName || 'N/A'}</p>
                        <p><strong>Year:</strong> ${d.year || '-'} | <strong>Sem:</strong> ${d.semester || '-'}</p>
                        <p><strong>Courses:</strong> ${(d.courses || []).join(', ')}</p>
                    </div>
                    <div class="detail-card" style="border-left-color: ${data.stats.percentage < 75 ? '#e74c3c' : '#2ecc71'};">
                        <h4>📊 Attendance Overview</h4>
                        <p><strong>Overall:</strong> ${data.stats.percentage}%</p>
                        <p><strong>Classes:</strong> ${data.stats.presentClasses} / ${data.stats.totalClasses}</p>
                        <p><strong>Status:</strong> ${data.stats.percentage < 75 ? '<span style="color:#e74c3c">At Risk ⚠️</span>' : '<span style="color:#2ecc71">Safe ✅</span>'}</p>
                    </div>
                    <div class="detail-card" style="grid-column: span 2;">
                        <h4>🗓️ Timetable Summary</h4>
                        ${data.timetable ? `<div style="display:flex; gap:10px; flex-wrap:wrap;">${Object.keys(data.timetable).filter(k=>Array.isArray(data.timetable[k])&&data.timetable[k].length>0&&k!=='_id').map(day=>`<span style="background:#333; padding:5px 10px; border-radius:4px; text-transform:capitalize;">${day}: ${data.timetable[day].length} classes</span>`).join('')}</div>` : '<p>No timetable set.</p>'}
                    </div>
                </div>`;
            modalBody.innerHTML = content;
        } catch (err) { modalBody.innerHTML = `<p style="color:red; text-align:center;">Error: ${err.message}</p>`; }
    };

    window.closeModal = () => { document.getElementById('userModal').style.display = "none"; };
    window.onclick = function(event) { if (event.target == document.getElementById('userModal')) window.closeModal(); };

    // --- CREATE USER ---
    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const mobile = document.getElementById('new_mobile').value;
        const password = document.getElementById('new_pass').value;
        if (!/^\d{10}$/.test(mobile)) { alert("Mobile must be 10 digits"); return; }
        if (password.length < 6) { alert("Password must be 6+ chars"); return; }

        const payload = {
            first_name: document.getElementById('new_first').value.trim(),
            last_name: document.getElementById('new_last').value.trim(),
            mobile, password,
            details: {
                collegeName: document.getElementById('new_college').value.trim(),
                semester: document.getElementById('new_sem').value.trim(),
                year: document.getElementById('new_year').value,
                courses: document.getElementById('new_courses').value.split(',').map(c=>c.trim())
            }
        };
        try {
            const res = await fetch(`${API_URL}/create-user`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'x-auth-token': token},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(res.ok) { alert(data.msg); e.target.reset(); loadAllUsers(); } else alert("Error: " + data.msg);
        } catch(e) { alert("Connection Error"); }
    });

    // --- ACTIONS ---
    window.deleteUser = async (id) => {
        if (!confirm("Delete user and wipe all data?")) return;
        try {
            const res = await fetch(`${API_URL}/user/${id}`, { method: 'DELETE', headers: {'x-auth-token': token} });
            const data = await res.json();
            if(res.ok) { alert(data.msg); loadAllUsers(); } else alert("Error: " + data.msg);
        } catch(e) { alert("Error deleting user"); }
    };

    window.changeRole = async (id, role) => {
        if (!confirm(`Change role to ${role}?`)) return;
        try {
            const res = await fetch(`${API_URL}/user-role/${id}`, { 
                method: 'PUT', 
                headers: {'Content-Type': 'application/json', 'x-auth-token': token},
                body: JSON.stringify({role}) 
            });
            if(res.ok) loadAllUsers();
        } catch(e) { alert("Error changing role"); }
    };

    window.resetUserPassword = async (id) => {
        const newPass = prompt("Enter new password (min 6 chars):");
        if (!newPass) return;
        if (newPass.length < 6) { alert("Too short!"); return; }
        try {
            const res = await fetch(`${API_URL}/reset-password/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ newPassword: newPass })
            });
            const data = await res.json();
            if (res.ok) alert(data.msg); else alert(data.msg);
        } catch (err) { alert("Error"); }
    };

    // --- MONITORING ---
    window.loadAtRiskData = async () => {
        document.getElementById('riskContainer').innerHTML = "Analyzing...";
        try {
            const res = await fetch(`${API_URL}/at-risk`, { headers: {'x-auth-token': token} });
            const data = await res.json();
            if(data.length === 0) { document.getElementById('riskContainer').innerHTML = "<p>🎉 No students at risk.</p>"; return; }
            let html = ``;
            data.forEach(s => { html += `<div class="risk-item"><div><strong>${s.name}</strong> (${s.college})<br>Mobile: ${s.mobile}</div><div style="color:#e74c3c;font-weight:bold;">${s.percentage}%</div></div>`; });
            document.getElementById('riskContainer').innerHTML = html;
        } catch (e) { document.getElementById('riskContainer').innerHTML = "Error loading data."; }
    };

    window.loadLogs = async () => {
        try {
            const res = await fetch(`${API_URL}/logs`, { headers: {'x-auth-token': token} });
            const logs = await res.json();
            let html = ``;
            logs.forEach(l => { html += `<div class="log-item"><small style="color:#888;">${new Date(l.timestamp).toLocaleString()}</small><br><strong>${l.action}</strong> by ${l.adminName}<br>${l.details}</div>`; });
            document.getElementById('logsContainer').innerHTML = html;
        } catch (e) { console.error(e); }
    };

    // --- BACKUP & RESTORE ---
    window.downloadBackup = async () => {
        if(!confirm("Download system backup?")) return;
        try {
            const res = await fetch(`${API_URL}/backup`, { headers: {'x-auth-token': token} });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        } catch(e) { alert("Backup failed"); }
    };

    window.uploadRestore = () => {
        const file = document.getElementById('restoreInput').files[0];
        if(!file) return;
        if(!confirm("⚠️ WARNING: This will WIPE current data and restore from file. Proceed?")) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const res = await fetch(`${API_URL}/restore`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'x-auth-token': token},
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if(res.ok) { alert(result.msg); window.location.reload(); }
                else throw new Error(result.msg);
            } catch(err) { alert("Restore Failed: " + err.message); }
        };
        reader.readAsText(file);
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});