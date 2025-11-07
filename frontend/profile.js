// --- NEW PROFILE.JS (Full API) ---

document.addEventListener("DOMContentLoaded", function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "index.html";
        return;
    }
    
    // Get the user data saved during login
    const user = JSON.parse(localStorage.getItem("user"));

    // Check if user has details
    if (user && user.details && user.details.collegeName) {
        // Populate the profile card
        document.getElementById("fullName").innerText = `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`;
        document.getElementById("college").innerText = user.details.collegeName;
        document.getElementById("semester").innerText = user.details.semester;
        document.getElementById("year").innerText = user.details.year;

        const coursesList = document.getElementById("coursesList");
        coursesList.innerHTML = ''; // Clear list
        user.details.courses.forEach(course => {
            const li = document.createElement("li");
            li.innerText = course;
            coursesList.appendChild(li);
        });
    } else {
        // If details are missing, show the "no details" message
        document.getElementById("profileDetails").style.display = "none";
        document.getElementById("noDetailsMsg").style.display = "block";
    }

    // --- Data Integrity Functions (Connected to API) ---

    // 1. EXPORT DATA
    document.getElementById("exportDataBtn").addEventListener("click", async function() {
        if (!confirm("This will export all your data (Profile, Attendance, Timetable, Study Plan) to a JSON file. Continue?")) {
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/export', {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data from server.');
            }

            const dataToExport = await response.json();
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            a.href = url;
            a.download = `attendance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert("Data exported successfully!");

        } catch (err) {
            console.error(err);
            alert("Error exporting data: " + err.message);
        }
    });

    // 2. IMPORT DATA (Trigger)
    const importFileInput = document.getElementById("importFileInput");
    importFileInput.style.display = 'inline-block'; // Make file input visible
    
    document.getElementById("importDataBtn").addEventListener("click", function() {
        importFileInput.click(); // Trigger the hidden file input
    });

    // 3. IMPORT DATA (Handler)
    importFileInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate the imported data
                if (!importedData || !importedData.userDetails) {
                    throw new Error('Invalid backup file. Missing "userDetails".');
                }

                if (confirm("WARNING: This will overwrite ALL your existing data in the database (Profile, Attendance, Timetable, Study Plan) with the data from this file. Continue?")) {
                    
                    const response = await fetch('http://localhost:3000/api/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify(importedData)
                    });

                    if (!response.ok) {
                        const error = await response.text();
                        throw new Error('Import failed: ' + error);
                    }

                    const result = await response.json();

                    // --- IMPORTANT: Update localStorage with the new user data ---
                    localStorage.setItem('user', JSON.stringify(result.user));

                    alert("Data imported successfully! The page will now reload to show the changes.");
                    window.location.reload();
                }
            } catch (error) {
                alert("Failed to read or import file: " + error.message);
                console.error(error);
            }
        };
        reader.readAsText(file);
        
        // Reset file input so 'change' fires again even for the same file
        event.target.value = null;
    });
});