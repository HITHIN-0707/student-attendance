// New contents for script.js
document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const loginData = {
        mobile: this.mobile.value,
        password: this.password.value
    };

    try {
        // Send login data to the backend server
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (response.ok) {
            const data = await response.json();
            
            // Save the token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // --- ADMIN REDIRECT ---
            // Check if the user has the 'admin' role
            if (data.user.role === 'admin') {
                window.location.href = "admin_dashboard.html"; // Redirect admin
            } else {
                window.location.href = "dashboard.html"; // Redirect regular user
            }
            // --- END REDIRECT ---

        } else {
            const data = await response.json();
            alert("Login failed: " + data.msg);
        }

    } catch (err) {
        console.error(err);
        alert("An error occurred. See console for details.");
    }
});