document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SOUND TOGGLE LOGIC ---
    const video = document.getElementById('bg-video');
    const soundBtn = document.getElementById('soundBtn');
    
    if(video && soundBtn) {
        soundBtn.addEventListener('click', () => {
            if (video.muted) {
                video.muted = false; // Turn Sound ON
                soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
                video.muted = true; // Turn Sound OFF
                soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            }
        });
    }

    // --- 2. LOGIN LOGIC ---
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mobile = document.getElementById('mobile').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    if (data.user.role === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert(data.msg);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Login failed. Server might be down.');
            }
        });
    }
});