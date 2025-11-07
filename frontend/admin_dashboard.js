// --- NEW admin_dashboard.js ---

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Check if user is an admin
    if (!token || !user || user.role !== 'admin') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return;
    }

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // Fetch and display all user data
    async function loadAllUsers() {
        try {
            const response = await fetch('https://student-attendance-backend-1287.onrender.com', {
                method: 'GET',
                headers: {
                    'x-auth-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const users = await response.json();
            displayUsers(users);

        } catch (error) {
            console.error(error);
            document.getElementById('userTableContainer').innerHTML = '<p>Error loading data.</p>';
        }
    }

    // Function to build the HTML table
    function displayUsers(users) {
        const container = document.getElementById('userTableContainer');
        if (users.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }

        let table = '<table>';
        // --- THIS SECTION IS UPDATED ---
        table += `
            <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Mobile</th>
                <th>Role</th> 
                <th>College</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Courses</th>
                <th>Hashed Password</th>
            </tr>
        `;
        // --- END OF UPDATE ---

        users.forEach(u => {
            const details = u.details || {};
            const courses = (details.courses || []).join(', ');

            // --- THIS SECTION IS UPDATED ---
            table += `
                <tr>
                    <td>${u.first_name || 'N/A'}</td>
                    <td>${u.last_name || 'N/A'}</td>
                    <td>${u.mobile || 'N/A'}</td>
                    <td>${u.role || 'user'}</td>
                    <td>${details.collegeName || 'N/A'}</td>
                    <td>${details.year || 'N/A'}</td>
                    <td>${details.semester || 'N/A'}</td>
                    <td>${courses || 'N/A'}</td>
                    <td>${u.password || 'N/A'}</td>
                </tr>
            `;
            // --- END OF UPDATE ---
        });

        table += '</table>';
        container.innerHTML = table;
    }

    // Load the data
    loadAllUsers();

    // --- THIS ENTIRE SECTION IS NEW ---
    // Handle the "Add Admin" form submission
    document.getElementById('addAdminForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newAdmin = {
            first_name: document.getElementById('admin_first_name').value,
            last_name: document.getElementById('admin_last_name').value,
            mobile: document.getElementById('admin_mobile').value,
            password: document.getElementById('admin_password').value
        };

        if (!confirm(`Are you sure you want to create a new admin with mobile: ${newAdmin.mobile}?`)) {
            return;
        }

        try {
            const response = await fetch('https://student-attendance-backend-1287.onrender.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(newAdmin)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Failed to create admin');
            }

            alert(data.msg); // "Admin user created successfully"
            e.target.reset(); // Clear the form
            loadAllUsers(); // Refresh the user table

        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
        }
    });
    // --- END OF NEW SECTION ---
});