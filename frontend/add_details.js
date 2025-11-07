// --- NEW ADD_DETAILS.JS ---

document.addEventListener("DOMContentLoaded", function() {
    const numSubjectsInput = document.getElementById("numSubjects");
    const subjectInputsContainer = document.getElementById("subjectInputs");
    const detailsForm = document.getElementById("detailsForm");
    const token = localStorage.getItem('token');

    // If no token, redirect to login
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Function to generate subject input fields
    function createSubjectInputs(num) {
        subjectInputsContainer.innerHTML = ''; // Clear existing
        for (let i = 1; i <= num; i++) {
            const div = document.createElement("div");
            div.className = "form-group";
            div.innerHTML = `
                <label for="subject${i}">Subject ${i}</label>
                <input type="text" id="subject${i}" class="subject-input" required>
            `;
            subjectInputsContainer.appendChild(div);
        }
    }

    // Listen for changes in the number of subjects input
    numSubjectsInput.addEventListener("input", function() {
        const num = parseInt(this.value, 10);
        if (num > 0) {
            createSubjectInputs(num);
        } else {
            subjectInputsContainer.innerHTML = '';
        }
    });

    // Handle form submission
    detailsForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        // Collect all subject values
        const subjectInputs = document.querySelectorAll(".subject-input");
        const courses = Array.from(subjectInputs).map(input => input.value.trim());

        // Prepare data to send to server
        const userDetails = {
            collegeName: document.getElementById("collegeName").value,
            semester: document.getElementById("semester").value,
            year: document.getElementById("year").value,
            courses: courses
        };

        try {
            // Send data to the backend
            const response = await fetch('http://localhost:3000/api/details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token // Send our auth token
                },
                body: JSON.stringify(userDetails)
            });

            if (!response.ok) {
                throw new Error('Failed to save details');
            }

            // --- IMPORTANT ---
            // Update the user object in localStorage with the new details
            const newDetails = await response.json();
            const user = JSON.parse(localStorage.getItem('user'));
            user.details = newDetails; // Add the new details
            localStorage.setItem('user', JSON.stringify(user));

            alert("Details saved successfully!");
            window.location.href = "dashboard.html"; // Go to dashboard

        } catch (err) {
            console.error(err);
            alert("Error saving details: " + err.message);
        }
    });
});