document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. AUTH CHECK ---
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const API_URL = 'https://student-attendance-psi-topaz.vercel.app/api';

    if (!token || !user) {
        window.location.href = "index.html";
        return;
    }

    // --- 2. POPULATE HEADER (Avatar Section) ---
    // Sets the top text: "John Doe" and "ID: 1234"
    const fullName = `${user.first_name} ${user.last_name}`;
    document.getElementById('userNameDisplay').textContent = fullName.toUpperCase();
    document.getElementById('userIdDisplay').textContent = user.mobile.slice(-4); 

    // --- 3. PRE-FILL FORM INPUTS ---
    // If the user already has details saved, show them in the inputs
    if (user.details) {
        document.getElementById('coll_name').value = user.details.collegeName || '';
        document.getElementById('year').value = user.details.year || '';
        document.getElementById('sem').value = user.details.semester || '';
        // Join the array of courses into a string "Math, Physics, Java"
        document.getElementById('courses').value = (user.details.courses || []).join(', ');
    }

    // --- 4. HANDLE FORM SUBMIT (Update) ---
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get the button to add visual effects
        const btn = document.querySelector('.update-btn');
        const originalContent = btn.innerHTML; // Save original text

        // Change button look to "Loading..."
        btn.innerHTML = '<span><i class="fas fa-circle-notch fa-spin"></i> UPLOADING...</span>';
        btn.style.opacity = '0.8';

        // Prepare data for server
        // We split the courses string by comma to make an array
        const payload = {
            collegeName: document.getElementById('coll_name').value,
            year: document.getElementById('year').value,
            semester: document.getElementById('sem').value,
            courses: document.getElementById('courses').value
                        .split(',')             // Split by comma
                        .map(c => c.trim())     // Remove spaces
                        .filter(c => c !== "")  // Remove empty strings
        };

        try {
            // Send data to backend
            const res = await fetch(`${API_URL}/details`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-auth-token': token 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // IMPORTANT: Update the local user object so the Dashboard sees changes immediately
                user.details = payload;
                localStorage.setItem('user', JSON.stringify(user));

                // Success Animation
                btn.innerHTML = '<span>✔ SUCCESS</span>';
                btn.style.background = '#00ff88'; // Green
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 20px #00ff88';

                // Redirect after 1 second
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                const err = await res.json();
                alert('Update failed: ' + err.msg);
                resetButton(btn, originalContent);
            }
        } catch (error) {
            console.error(error);
            alert('Server connection error.');
            resetButton(btn, originalContent);
        }
    });

    // Helper to reset button if error occurs
    function resetButton(btn, originalContent) {
        btn.innerHTML = originalContent;
        btn.style.opacity = '1';
        btn.style.background = '#00f3ff';
        btn.style.color = '#000';
        btn.style.boxShadow = 'none';
    }
});