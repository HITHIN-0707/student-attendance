// New contents for signup.js
document.getElementById("signupForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const signupData = {
        first_name: this.first_name.value,
        middle_name: this.middle_name.value,
        last_name: this.last_name.value,
        mobile: this.mobile.value,
        password: this.password.value
    };

    try {
        // Send data to the backend server
       // Add '/signup' at the end
const response = await fetch('https://my-attendance-api-7vbt.onrender.com/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(signupData)
        });

        if (response.status === 201) {
            alert("Signup successful!");
            window.location.href = "index.html"; // Go to login page
        } else {
            // Get error message from server
            const data = await response.json();
            alert("Signup failed: " + data.msg);
        }

    } catch (err) {
        console.error(err);
        alert("An error occurred. See console for details.");
    }
});