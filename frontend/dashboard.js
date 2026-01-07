// --- UPDATED DASHBOARD.JS (Per-Subject Period Select) ---

// --- 1. Global variables ---
let allAttendanceData = []; 
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));
const API_URL = 'http://localhost:3000/api';

if (!token || !user) {
    window.location.href = "index.html";
} else {
    const welcomeMsg = document.getElementById("welcomeMsg");
    const yearSelect = document.getElementById("year-select");
    const semesterSelect = document.getElementById("semester-select");
    const attendanceDateInput = document.getElementById("attendance-date");
    const coursesContainer = document.getElementById("coursesContainer");
    const reportContainer = document.getElementById("reportContainer");
    const reportBtn = document.getElementById("reportBtn");

    async function initializeDashboard() {
        welcomeMsg.innerText = `Hello ${user.first_name}`;
        
        const today = new Date().toISOString().slice(0, 10);
        attendanceDateInput.max = today;
        attendanceDateInput.value = today;

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
            coursesContainer.innerHTML = '<p>Please add your college and course details first.</p>';
        }

        await fetchAttendanceData();
        displayCourses();

        yearSelect.addEventListener("change", displayCourses);
        semesterSelect.addEventListener("change", displayCourses);
        attendanceDateInput.addEventListener("change", displayCourses);
        reportBtn.addEventListener("click", generateAttendanceReport);
    }

    async function fetchAttendanceData() {
        try {
            const response = await fetch(`${API_URL}/attendance`, {
                method: 'GET',
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('Failed to fetch data');
            allAttendanceData = await response.json();
        } catch (error) {
            console.error(error);
            alert('Could not load attendance data.');
        }
    }

    // --- UPDATED: Handle Attendance (Reads specific input) ---
    async function handleAttendance(course, status) {
        const selectedDate = attendanceDateInput.value;
        const selectedYear = yearSelect.value;
        const selectedSemester = semesterSelect.value;
        
        // Generate the ID used in displayCourses to find the correct input
        const safeCourseId = course.replace(/[^a-zA-Z0-9]/g, '');
        const periodInput = document.getElementById(`periods-${safeCourseId}`);
        const selectedPeriods = parseInt(periodInput.value) || 1;

        if (!selectedDate || !selectedYear || !selectedSemester) {
            alert("Please select a year, semester, and date.");
            return;
        }
        if (selectedPeriods < 1) {
            alert("Periods must be at least 1");
            return;
        }

        const attendanceRecord = {
            course,
            status,
            date: selectedDate,
            year: selectedYear,
            semester: selectedSemester,
            periods: selectedPeriods 
        };

        try {
            const response = await fetch(`${API_URL}/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(attendanceRecord)
            });

            if (!response.ok) throw new Error('Failed to save attendance');

            const updatedCourseData = await response.json();
            
            const index = allAttendanceData.findIndex(item => item.course === course);
            if (index !== -1) {
                allAttendanceData[index] = updatedCourseData;
            } else {
                allAttendanceData.push(updatedCourseData);
            }
            
            const msg = status === "Present" ? "Attended" : "Missed";
            alert(`Marked: ${selectedPeriods} period(s) ${msg} for ${course}.`);
            displayCourses(); // Refresh UI

        } catch (error) {
            console.error(error);
            alert('Failed to save attendance.');
        }
    }

    function calculateAttendance(course) {
        const courseData = allAttendanceData.find(item => item.course === course);
        if (!courseData) {
            return { totalClasses: 0, presentClasses: 0, absentClasses: 0, percentage: "0.00", classesNeeded: 0 };
        }

        const filteredRecords = (courseData.records || []).filter(record => 
            record.year === yearSelect.value && 
            record.semester === semesterSelect.value &&
            record.date <= attendanceDateInput.value
        );
        
        let totalClasses = 0;
        let presentClasses = 0;
        let absentClasses = 0;

        filteredRecords.forEach(r => {
            const p = r.periods || 1;
            totalClasses += p;
            if (r.status === 'Present') presentClasses += p;
            else absentClasses += p;
        });

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

    function calculateCanMiss(course) {
        const courseData = allAttendanceData.find(item => item.course === course);
        if (!courseData) return 0;

        const filteredRecords = (courseData.records || []).filter(record => 
            record.year === yearSelect.value && 
            record.semester === semesterSelect.value &&
            record.date <= attendanceDateInput.value
        );
        
        let totalClasses = 0;
        let presentClasses = 0;
        filteredRecords.forEach(r => {
            const p = r.periods || 1;
            totalClasses += p;
            if (r.status === 'Present') presentClasses += p;
        });

        if (totalClasses === 0) return 0;

        let missableClasses = 0;
        while (true) {
            const newTotal = totalClasses + missableClasses + 1; 
            const newPercentage = (presentClasses / newTotal) * 100;
            if (newPercentage < 75) {
                return Math.max(0, missableClasses); 
            }
            missableClasses++;
            if (missableClasses > 100) return 100;
        }
    }

    function displayCourses() {
        coursesContainer.innerHTML = '';
        coursesContainer.style.display = 'flex';
        reportContainer.style.display = 'none';

        if (user.details && yearSelect.value == user.details.year && semesterSelect.value == user.details.semester) {
            user.details.courses.forEach((course) => {
                const courseBox = document.createElement("div");
                courseBox.className = "course-box";

                const courseTitle = document.createElement("h3");
                courseTitle.textContent = course;
                courseBox.appendChild(courseTitle);

                const attendanceStats = calculateAttendance(course);
                const percentage = parseFloat(attendanceStats.percentage);
                const canMiss = calculateCanMiss(course); 
                
                let riskClass = 'red';
                if (percentage >= 75) riskClass = 'green';
                else if (percentage >= 65) riskClass = 'yellow';

                // Create a unique ID for the input of this specific course
                const safeCourseId = course.replace(/[^a-zA-Z0-9]/g, '');

                const statsDiv = document.createElement("div");
                statsDiv.className = "stats-container";
                statsDiv.innerHTML = `
                    <p><strong>Attendance:</strong> <span class="attendance-percentage">${attendanceStats.percentage}%</span></p>
                    <div class="risk-bar-container">
                        <div class="risk-bar ${riskClass}" style="width: ${percentage}%;"></div>
                    </div>
                    <p>Total Periods: ${attendanceStats.totalClasses}</p>
                    <p class="present-count">Attended: ${attendanceStats.presentClasses}</p>
                    <p class="absent-count">Missed: ${attendanceStats.absentClasses}</p>
                    
                    <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 6px;">
                        <label for="periods-${safeCourseId}" style="font-size: 13px; color: #aaa;">No. of Periods:</label>
                        <input type="number" id="periods-${safeCourseId}" value="1" min="1" max="10" 
                            style="width: 50px; padding: 5px; border-radius: 4px; border: 1px solid #444; background: #222; color: #fff; text-align: center;">
                    </div>

                    <p class="classes-needed-text">To reach 75%, attend <strong>${attendanceStats.classesNeeded}</strong> more periods.</p>
                    <p class="can-miss-text">You can miss <strong>${canMiss}</strong> more period(s).</p>
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
    
    function generateAttendanceReport() {
        // (Report logic unchanged from previous version)
        const selectedYear = yearSelect.value;
        const selectedSemester = semesterSelect.value;
        const selectedDate = attendanceDateInput.value;
        
        if (!selectedYear || !selectedSemester || !selectedDate) {
            alert("Please select a year, semester, and date.");
            return;
        }

        coursesContainer.style.display = 'none';
        reportContainer.style.display = 'block';
        reportContainer.innerHTML = `<h2>Attendance Report for ${selectedYear} - Semester ${selectedSemester} (till ${selectedDate})</h2>`;

        let totalPresent = 0;
        let totalClasses = 0;

        if (allAttendanceData.length === 0) {
            reportContainer.innerHTML += '<p style="text-align: center;">No attendance data available.</p>';
            return;
        }
        
        allAttendanceData.forEach(courseData => {
            const stats = calculateAttendance(courseData.course);
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

        allAttendanceData.forEach(courseData => {
            if (user.details.courses.includes(courseData.course)) {
                const stats = calculateAttendance(courseData.course);
                if (stats.totalClasses > 0) {
                    const subjectItem = document.createElement("div");
                    subjectItem.className = "subject-report-item";
                    subjectItem.innerHTML = `
                        <h4>${courseData.course}</h4>
                        <p><strong>Attendance:</strong> ${stats.percentage}%</p>
                        <p>Attended: ${stats.presentClasses} periods</p>
                        <p>Missed: ${stats.absentClasses} periods</p>
                        <p>Need ${stats.classesNeeded} more periods for 75%.</p>
                    `;
                    subjectList.appendChild(subjectItem);
                }
            }
        });
    }

    document.getElementById("addDetailsBtn").addEventListener("click", () => window.location.href = "add_details.html");
    document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
    document.getElementById("studyplanner").addEventListener("click", () => window.location.href = "studyplaner.html");
    document.getElementById("timetableBtn").addEventListener("click", () => window.location.href = "timetable.html");
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });

    initializeDashboard();
}

// =========================================
    //      FIXED: PDF GENERATION LOGIC
    // =========================================

    // 1. Open Modal
    const downloadBtn = document.getElementById('downloadBtn');
    const pdfModal = document.getElementById('pdfModalOverlay');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // FIX: Get values directly from the element to avoid "ReferenceError"
            const y = document.getElementById('year-select').value;
            const s = document.getElementById('semester-select').value;
            
            if(!y || !s) {
                alert("Please select a Year and Semester first.");
                return;
            }
            pdfModal.style.display = 'flex';
        });
    }

    // 2. Close Modal
    window.closePdfModal = () => {
        if(pdfModal) pdfModal.style.display = 'none';
    };

    // 3. Generate PDF Logic
    window.generatePDF = (format) => {
        // Safety Check: Library Loaded?
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("Error: PDF Library not loaded. Please refresh.");
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Safety Check: AutoTable Loaded?
            if (typeof doc.autoTable !== 'function') {
                alert("Error: Table plugin not loaded.");
                return;
            }

            // FIX: Re-select elements here to ensure we have access
            const selYear = document.getElementById('year-select').value;
            const selSem = document.getElementById('semester-select').value;
            
            // Get User Info (Global variables)
            const userName = user ? `${user.first_name} ${user.last_name}` : "Student";
            const college = (user.details && user.details.collegeName) ? user.details.collegeName : "My College";
            const mobile = user ? user.mobile : "";
            const dateStr = new Date().toLocaleDateString();

            // -- GATHER DATA --
            let subjectsToShow = [];
            
            // Check if looking at Current Profile or History
            const isCurrent = (user.details && selYear == user.details.year && selSem == user.details.semester);
            
            if (isCurrent) {
                subjectsToShow = user.details.courses;
            } else {
                // Filter History from Global Variable allAttendanceData
                subjectsToShow = [...new Set(
                    allAttendanceData
                    .filter(r => String(r.year) === String(selYear) && String(r.semester) === String(selSem))
                    .map(r => r.course)
                )];
            }

            if (subjectsToShow.length === 0) {
                alert("No subjects found for this semester.");
                return;
            }

            // Prepare Table Rows
            const tableRows = [];
            subjectsToShow.forEach(course => {
                // Reuse the existing calculation logic
                const stats = calculateAttendance(course); 
                
                if (stats.totalClasses > 0) {
                    let status = "Good";
                    if(stats.percentage < 75) status = "At Risk";
                    if(stats.percentage < 65) status = "Critical";
                    
                    tableRows.push([
                        course, 
                        `${stats.presentClasses}/${stats.totalClasses}`, 
                        `${stats.percentage}%`, 
                        status
                    ]);
                }
            });

            // -- FORMAT 1: SIMPLE SUMMARY --
            if (format === 'simple') {
                doc.setFontSize(18);
                doc.text(`Attendance Summary`, 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Name: ${userName}`, 14, 30);
                doc.text(`Year: ${selYear} | Sem: ${selSem}`, 14, 36);

                doc.autoTable({
                    startY: 45,
                    head: [['Subject', 'Attended', 'Percentage', 'Status']],
                    body: tableRows,
                    theme: 'grid',
                    headStyles: { fillColor: [44, 62, 80] }
                });

                doc.save(`Summary_${selYear}_${selSem}.pdf`);
            }

            // -- FORMAT 2: OFFICIAL REPORT CARD --
            if (format === 'official') {
                // Header Bar
                doc.setFillColor(41, 128, 185);
                doc.rect(0, 0, 210, 40, 'F'); 
                
                // Header Text
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.text("OFFICIAL ATTENDANCE REPORT", 105, 20, null, null, "center");
                doc.setFontSize(12);
                doc.text(college.toUpperCase(), 105, 30, null, null, "center");

                // Student Details
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.text(`Student Name:`, 14, 55);
                doc.setFont("helvetica", "bold");
                doc.text(userName, 50, 55);
                
                doc.setFont("helvetica", "normal");
                doc.text(`Mobile:`, 14, 62);
                doc.text(mobile, 50, 62);

                doc.text(`Semester:`, 140, 55);
                doc.text(`${selSem} (Year ${selYear})`, 170, 55);
                
                doc.text(`Date:`, 140, 62);
                doc.text(dateStr, 170, 62);

                // Table
                doc.autoTable({
                    startY: 75,
                    head: [['Subject Name', 'Attendance Ratio', 'Percentage (%)', 'Academic Status']],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], halign: 'center' },
                    bodyStyles: { halign: 'center' },
                    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }, 
                    
                    // Highlight Low Attendance in Red
                    didParseCell: function (data) {
                        if (data.section === 'body' && data.column.index === 2) {
                            const val = parseFloat(data.cell.raw);
                            if (val < 75) data.cell.styles.textColor = [231, 76, 60]; 
                        }
                    }
                });

                // Footer Signature
                const finalY = doc.lastAutoTable.finalY + 40;
                doc.setDrawColor(0, 0, 0);
                doc.line(15, finalY, 80, finalY);
                doc.text("Parent Signature", 25, finalY + 10);

                doc.line(130, finalY, 195, finalY); 
                doc.text("Authority Signature", 145, finalY + 10);

                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text("This document is computer generated.", 105, 280, null, null, "center");

                doc.save(`Official_Report_${userName}.pdf`);
            }

            closePdfModal();

        } catch (err) {
            console.error("PDF ERROR:", err);
            alert("Failed to generate PDF. Error: " + err.message);
        }
    };