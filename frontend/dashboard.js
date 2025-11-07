// --- NEW DASHBOARD.JS ---

// --- 1. Global variables to hold data ---
let allAttendanceData = []; // This will hold data fetched from the server
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));
const API_URL = 'http://localhost:3000/api';

// --- 2. Check login status (Token) ---
if (!token || !user) {
    window.location.href = "index.html";
} else {
    // --- 3. Get all document elements ---
    const welcomeMsg = document.getElementById("welcomeMsg");
    const yearSelect = document.getElementById("year-select");
    const semesterSelect = document.getElementById("semester-select");
    const attendanceDateInput = document.getElementById("attendance-date");
    const coursesContainer = document.getElementById("coursesContainer");
    const reportContainer = document.getElementById("reportContainer");
    const reportBtn = document.getElementById("reportBtn");

    // --- 4. Main function to start the page ---
    async function initializeDashboard() {
        // Set welcome message
        welcomeMsg.innerText = `Hello ${user.first_name}`;

        // Set the max date for the date input to today
        const today = new Date().toISOString().slice(0, 10);
        attendanceDateInput.max = today;
        attendanceDateInput.value = today;

        // Populate dropdowns with user data if available
        if (user.details && user.details.year && user.details.semester) {
            const yearOption = document.createElement("option");
            yearOption.value = user.details.year;
            yearOption.textContent = `Year ${user.details.year}`;
            yearSelect.appendChild(yearOption);

            const semesterOption = document.createElement("option");
            semesterOption.value = user.details.semester;
            semesterOption.textContent = `Semester ${user.details.semester}`;
            semesterSelect.appendChild(semesterOption);
        } else {
            // If no details, prompt user to add them
            coursesContainer.innerHTML = '<p>Please add your college and course details first.</p>';
        }

        // --- 5. FETCH DATA FROM SERVER ---
        await fetchAttendanceData();
        
        // Display courses based on fetched data
        displayCourses();

        // Add event listeners
        yearSelect.addEventListener("change", displayCourses);
        semesterSelect.addEventListener("change", displayCourses);
        attendanceDateInput.addEventListener("change", displayCourses); // Refresh stats on date change
        reportBtn.addEventListener("click", generateAttendanceReport);
    }

    // --- 6. Function to GET data from server ---
    async function fetchAttendanceData() {
        try {
            const response = await fetch(`${API_URL}/attendance`, {
                method: 'GET',
                headers: {
                    'x-auth-token': token // Send our "ID card"
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            allAttendanceData = await response.json();
            console.log("Fetched data:", allAttendanceData);
        } catch (error) {
            console.error(error);
            alert('Could not load attendance data.');
        }
    }

    // --- 7. Function to POST data to server ---
    async function handleAttendance(course, status) {
        const selectedDate = attendanceDateInput.value;
        const selectedYear = yearSelect.value;
        const selectedSemester = semesterSelect.value;
        
        if (!selectedDate || !selectedYear || !selectedSemester) {
            alert("Please select a year, semester, and date.");
            return;
        }

        const attendanceRecord = {
            course,
            status,
            date: selectedDate,
            year: selectedYear,
            semester: selectedSemester
        };

        try {
            const response = await fetch(`${API_URL}/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token // Prove who we are
                },
                body: JSON.stringify(attendanceRecord)
            });

            if (response.status === 400) {
                const data = await response.json();
                alert(data.msg); // "Attendance for this date already marked"
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to save attendance');
            }

            // --- IMPORTANT: Update our local data with the server's response ---
            const updatedCourseData = await response.json();
            
            // Find and replace the old data with the new data
            const index = allAttendanceData.findIndex(item => item.course === course);
            if (index !== -1) {
                allAttendanceData[index] = updatedCourseData;
            } else {
                allAttendanceData.push(updatedCourseData);
            }
            
            alert(`Attendance logged for ${course} on ${selectedDate}: ${status}`);
            displayCourses(); // Refresh the screen

        } catch (error) {
            console.error(error);
            alert('Failed to save attendance.');
        }
    }

    // --- 8. Function to CALCULATE attendance (reads from allAttendanceData) ---
    function calculateAttendance(course) {
        // Find the specific course data from our fetched data
        const courseData = allAttendanceData.find(item => item.course === course);

        if (!courseData) {
            return { totalClasses: 0, presentClasses: 0, absentClasses: 0, percentage: "0.00", classesNeeded: 0 };
        }

        // Filter records based on selected dropdowns
        const filteredRecords = (courseData.records || []).filter(record => 
            record.year === yearSelect.value && 
            record.semester === semesterSelect.value &&
            record.date <= attendanceDateInput.value // Show stats "up to" selected date
        );
        
        const totalClasses = filteredRecords.length;
        const presentClasses = filteredRecords.filter(record => record.status === "Present").length;
        const absentClasses = filteredRecords.filter(record => record.status === "Absent").length;
        const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
        
        const classesNeeded = totalClasses > 0 ? Math.ceil(0.75 * totalClasses) - presentClasses : 0;

        return {
            totalClasses,
            presentClasses,
            absentClasses,
            percentage: percentage.toFixed(2),
            classesNeeded: classesNeeded > 0 ? classesNeeded : 0
        };
    }

    // --- 9. Function to CALCULATE missable classes (reads from allAttendanceData) ---
    function calculateCanMiss(course) {
        const courseData = allAttendanceData.find(item => item.course === course);
        if (!courseData) return 0;

        const filteredRecords = (courseData.records || []).filter(record => 
            record.year === yearSelect.value && 
            record.semester === semesterSelect.value &&
            record.date <= attendanceDateInput.value
        );
        
        const totalClasses = filteredRecords.length;
        const presentClasses = filteredRecords.filter(record => record.status === "Present").length;
        
        if (totalClasses === 0) return 0;

        let missableClasses = 0;
        while (true) {
            const newTotal = totalClasses + missableClasses + 1; 
            const newPercentage = (presentClasses / newTotal) * 100;
            if (newPercentage < 75) {
                return Math.max(0, missableClasses); 
            }
            missableClasses++;
            if (missableClasses > 100) return 100; // Safety break
        }
    }

    // --- 10. Function to DISPLAY courses (reads from allAttendanceData) ---
    function displayCourses() {
        coursesContainer.innerHTML = '';
        coursesContainer.style.display = 'flex';
        reportContainer.style.display = 'none';

        // Check that user details match the selected dropdowns
        if (user.details && yearSelect.value == user.details.year && semesterSelect.value == user.details.semester) {
            
            // Loop through the COURSES listed in the USER'S profile
            user.details.courses.forEach((course) => {
                const courseBox = document.createElement("div");
                courseBox.className = "course-box";

                const courseTitle = document.createElement("h3");
                courseTitle.textContent = course;
                courseBox.appendChild(courseTitle);

                // Calculate stats for this course using data from the server
                const attendanceStats = calculateAttendance(course);
                const percentage = parseFloat(attendanceStats.percentage);
                
                let riskClass = 'red';
                if (percentage >= 75) {
                    riskClass = 'green';
                } else if (percentage >= 65) { 
                    riskClass = 'yellow';
                }

                const canMiss = calculateCanMiss(course); 

                const statsDiv = document.createElement("div");
                statsDiv.className = "stats-container";
                statsDiv.innerHTML = `
                    <p><strong>Attendance:</strong> <span class="attendance-percentage">${attendanceStats.percentage}%</span></p>
                    <div class="risk-bar-container">
                        <div class="risk-bar ${riskClass}" style="width: ${percentage}%;"></div>
                    </div>
                    <p>Total Classes: ${attendanceStats.totalClasses}</p>
                    <p class="present-count">Present: ${attendanceStats.presentClasses}</p>
                    <p class="absent-count">Absent: ${attendanceStats.absentClasses}</p>
                    <p class="classes-needed-text">To reach 75%, attend <strong>${attendanceStats.classesNeeded}</strong> more classes.</p>
                    <p class="can-miss-text">
                        You can miss <strong>${canMiss}</strong> more class(es) to stay above 75%.
                    </p>
                `;
                courseBox.appendChild(statsDiv);

                const buttonContainer = document.createElement("div");
                buttonContainer.style.marginTop = "15px";

                const presentBtn = document.createElement("button");
                presentBtn.textContent = "Present";
                presentBtn.className = "attendance-btn present-btn";
                presentBtn.addEventListener("click", () => handleAttendance(course, "Present"));
                
                const absentBtn = document.createElement("button");
                absentBtn.textContent = "Absent";
                absentBtn.className = "attendance-btn absent-btn";
                absentBtn.addEventListener("click", () => handleAttendance(course, "Absent"));

                buttonContainer.appendChild(presentBtn);
                buttonContainer.appendChild(absentBtn);

                courseBox.appendChild(buttonContainer);
                coursesContainer.appendChild(courseBox);
            });
        }
    }
    
    // --- 11. Function to GENERATE report (reads from allAttendanceData) ---
    function generateAttendanceReport() {
        const selectedYear = yearSelect.value;
        const selectedSemester = semesterSelect.value;
        const selectedDate = attendanceDateInput.value;
        
        if (!selectedYear || !selectedSemester || !selectedDate) {
            alert("Please select a year, semester, and date to generate a report.");
            return;
        }

        coursesContainer.style.display = 'none';
        reportContainer.style.display = 'block';
        reportContainer.innerHTML = `<h2>Attendance Report for ${selectedYear} - Semester ${selectedSemester} (till ${selectedDate})</h2>`;

        let totalPresent = 0;
        let totalClasses = 0;

        if (allAttendanceData.length === 0) {
            reportContainer.innerHTML += '<p style="text-align: center;">No attendance data available for the selected criteria.</p>';
            return;
        }
        
        // Calculate overall attendance
        allAttendanceData.forEach(courseData => {
            const stats = calculateAttendance(courseData.course); // Use our existing calculator
            totalClasses += stats.totalClasses;
            totalPresent += stats.presentClasses;
        });

        const overallPercentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
        
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "report-summary";
        summaryDiv.innerHTML = `<p>Overall Attendance: <span class="attendance-percentage">${overallPercentage.toFixed(2)}%</span></p>`;
        reportContainer.appendChild(summaryDiv);
        
        const subjectList = document.createElement("div");
        subjectList.className = "subject-report-list";
        reportContainer.appendChild(subjectList);

        // Display individual subject reports
        allAttendanceData.forEach(courseData => {
            // Only show courses that are part of the user's profile
            if (user.details.courses.includes(courseData.course)) {
                const stats = calculateAttendance(courseData.course);
                if (stats.totalClasses > 0) {
                    const subjectItem = document.createElement("div");
                    subjectItem.className = "subject-report-item";
                    subjectItem.innerHTML = `
                        <h4>${courseData.course}</h4>
                        <p><strong>Attendance:</strong> ${stats.percentage}%</p>
                        <p>Present: ${stats.presentClasses}</p>
                        <p>Absent: ${stats.absentClasses}</p>
                        <p>To reach 75%, attend ${stats.classesNeeded} more classes.</p>
                    `;
                    subjectList.appendChild(subjectItem);
                }
            }
        });
    }

    // --- 12. Handle navigation buttons (unchanged) ---
    document.getElementById("addDetailsBtn").addEventListener("click", function() {
        window.location.href = "add_details.html";
    });
    document.getElementById("profileBtn").addEventListener("click", function() {
        window.location.href = "profile.html";
    });
    document.getElementById("studyplanner").addEventListener("click", function() {
        window.location.href = "studyplaner.html"
    });
    document.getElementById("timetableBtn").addEventListener("click", function() {
        window.location.href = "timetable.html"; 
    });
    document.getElementById("logoutBtn").addEventListener("click", function() {
        localStorage.removeItem("token"); // Clear the token
        localStorage.removeItem("user");  // Clear the user
        window.location.href = "index.html";
    });

    // --- 13. Start the page ---
    initializeDashboard();
}