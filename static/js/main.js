// Main JavaScript File

// Auto-save functionality for attendance
let autoSaveTimer = null;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

function initializeAutoSave() {
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        // Clear any existing timer
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
        }
        
        // Set up new auto-save timer
        autoSaveTimer = setInterval(() => {
            if (hasUnsavedChanges()) {
                saveAttendance(false); // false = auto-save
            }
        }, AUTO_SAVE_INTERVAL);
        
        // Save on page unload
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                saveAttendance(true); // true = final save
            }
        });
    }
}

function hasUnsavedChanges() {
    // Check if any attendance status has been changed
    const statusSelects = document.querySelectorAll('.status-select');
    for (let select of statusSelects) {
        if (select.dataset.original !== select.value) {
            return true;
        }
    }
    return false;
}

function saveAttendance(isFinal = false) {
    const attendanceForm = document.getElementById('attendanceForm');
    if (!attendanceForm) return;
    
    const formData = new FormData(attendanceForm);
    const attendanceData = {
        date: document.getElementById('attendanceDate').value,
        attendance: []
    };
    
    // Collect attendance data
    document.querySelectorAll('.attendance-row').forEach(row => {
        const studentId = row.dataset.studentId;
        const statusSelect = row.querySelector('.status-select');
        
        if (studentId && statusSelect) {
            attendanceData.attendance.push({
                student_id: studentId,
                status: statusSelect.value
            });
        }
    });
    
    // Send to server
    fetch(attendanceForm.action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update original values
            document.querySelectorAll('.status-select').forEach(select => {
                select.dataset.original = select.value;
            });
            
            if (!isFinal) {
                showNotification('Attendance auto-saved successfully!', 'success');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (!isFinal) {
            showNotification('Error auto-saving attendance', 'danger');
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Toggle attendance status
function toggleAttendanceStatus(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status-cell');
    const currentStatus = button.dataset.status;
    
    let newStatus;
    switch(currentStatus) {
        case 'Present':
            newStatus = 'Absent';
            button.className = 'btn btn-danger btn-sm';
            break;
        case 'Absent':
            newStatus = 'Late';
            button.className = 'btn btn-warning btn-sm';
            break;
        case 'Late':
            newStatus = 'Present';
            button.className = 'btn btn-success btn-sm';
            break;
        default:
            newStatus = 'Present';
            button.className = 'btn btn-success btn-sm';
    }
    
    button.dataset.status = newStatus;
    button.innerHTML = `<i class="fas fa-${getStatusIcon(newStatus)}"></i> ${newStatus}`;
    statusCell.innerHTML = `<span class="badge badge-${newStatus.toLowerCase()}">${newStatus}</span>`;
    
    // Mark as changed for auto-save
    button.dataset.changed = 'true';
}

function getStatusIcon(status) {
    switch(status) {
        case 'Present': return 'check-circle';
        case 'Absent': return 'times-circle';
        case 'Late': return 'clock';
        default: return 'question-circle';
    }
}

// Filter table rows
function filterTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toUpperCase();
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        let display = false;
        
        for (let j = 0; j < row.cells.length; j++) {
            const cell = row.cells[j];
            if (cell) {
                const txtValue = cell.textContent || cell.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    display = true;
                    break;
                }
            }
        }
        
        row.style.display = display ? '' : 'none';
    }
}

// Initialize date pickers
function initializeDatePickers() {
    const dateInputs = document.querySelectorAll('.date-picker');
    dateInputs.forEach(input => {
        input.type = 'date';
        if (!input.value) {
            input.value = new Date().toISOString().split('T')[0];
        }
    });
}

// Export to CSV
function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    for (let row of rows) {
        const rowData = [];
        const cols = row.querySelectorAll('td, th');
        
        for (let col of cols) {
            let data = col.innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
            data = data.replace(/"/g, '""');
            rowData.push('"' + data + '"');
        }
        
        csv.push(rowData.join(','));
    }
    
    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename + '.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Load attendance for specific date
function loadAttendanceForDate() {
    const date = document.getElementById('attendanceDate').value;
    const subjectId = document.getElementById('subjectId').value;
    const classId = document.getElementById('classId').value;
    
    if (!date || !subjectId || !classId) return;
    
    fetch(`/api/get-attendance/${subjectId}/${classId}/${date}`)
        .then(response => response.json())
        .then(data => {
            // Update attendance status for each student
            document.querySelectorAll('.attendance-row').forEach(row => {
                const studentId = row.dataset.studentId;
                const statusSelect = row.querySelector('.status-select');
                
                if (studentId && statusSelect && data[studentId]) {
                    statusSelect.value = data[studentId];
                }
            });
        })
        .catch(error => console.error('Error loading attendance:', error));
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeDatePickers();
    initializeAutoSave();
    
    // Set up event listeners
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.addEventListener('change', loadAttendanceForDate);
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Confirm delete actions
    document.querySelectorAll('.confirm-delete').forEach(link => {
        link.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this item?')) {
                e.preventDefault();
            }
        });
    });
});

// Chart.js for reports
function initializeAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June'],
            datasets: [{
                label: 'Attendance Percentage',
                data: [85, 92, 78, 88, 95, 90],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}