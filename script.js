document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const START_HOUR = 7; // 7 AM
    const END_HOUR = 22; // 10 PM
    const HOUR_HEIGHT = 60; // pixels per hour
    
    // --- Elements ---
    const timeLabelsContainer = document.getElementById('timeLabels');
    const gridLinesContainer = document.getElementById('gridLines');
    const classForm = document.getElementById('classForm');
    const colorButtons = document.querySelectorAll('.color-btn');
    const classesList = document.getElementById('classesList');
    const daysContainer = document.getElementById('daysContainer');
    const clearBtn = document.getElementById('clearBtn');
    const printBtn = document.getElementById('printBtn');
    const formError = document.getElementById('formError');
    
    // --- State ---
    let classes = JSON.parse(localStorage.getItem('ucc_timetable_classes')) || [];
    let selectedColor = '#2563eb'; // default primary
    
    // --- Initialization ---
    initGrid();
    setupColorPicker();
    renderClassesList();
    renderTimetable();
    
    // --- Functions Setup Grid ---
    function initGrid() {
        // Set dynamic height for columns
        const totalHours = END_HOUR - START_HOUR;
        const totalHeight = totalHours * HOUR_HEIGHT;
        
        daysContainer.style.height = `${totalHeight}px`;
        timeLabelsContainer.style.height = `${totalHeight}px`;
        gridLinesContainer.style.height = `${totalHeight}px`;
        
        // Generate time labels and lines
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            // Label
            if (hour < END_HOUR) {
                const timeStr = formatAMPM(hour);
                const label = document.createElement('div');
                label.className = 'time-label';
                label.style.top = `${(hour - START_HOUR) * HOUR_HEIGHT}px`;
                label.innerText = timeStr;
                timeLabelsContainer.appendChild(label);
            }
            
            // Full hour line
            const line = document.createElement('div');
            line.className = 'grid-line';
            line.style.top = `${(hour - START_HOUR) * HOUR_HEIGHT}px`;
            gridLinesContainer.appendChild(line);
            
            // Half hour line
            if (hour < END_HOUR) {
                const halfLine = document.createElement('div');
                halfLine.className = 'grid-line half-hour';
                halfLine.style.top = `${((hour - START_HOUR) + 0.5) * HOUR_HEIGHT}px`;
                gridLinesContainer.appendChild(halfLine);
            }
        }
    }
    
    function formatAMPM(hour) {
        let h = hour % 12;
        if (h === 0) h = 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h}:00 ${ampm}`;
    }
    
    // --- Form & Color Picker ---
    function setupColorPicker() {
        colorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all
                colorButtons.forEach(b => b.classList.remove('active'));
                // Add active to clicked
                btn.classList.add('active');
                selectedColor = btn.dataset.color;
            });
        });
    }
    
    classForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subject = document.getElementById('subject').value.trim();
        const professor = document.getElementById('professor').value.trim();
        const day = document.getElementById('day').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        // Validation
        if (!day) {
            formError.innerText = "Por favor seleccione un día.";
            formError.style.display = "block";
            return;
        }
        
        if (startTime >= endTime) {
            formError.innerText = "La hora de inicio debe ser antes que la de fin.";
            formError.style.display = "block";
            return;
        }
        
        // Check for conflicts
        const newClass = {
            id: Date.now().toString(),
            subject,
            professor,
            day,
            startTime,
            endTime,
            color: selectedColor
        };
        
        classes.push(newClass);
        saveData();
        
        // Reset form
        classForm.reset();
        formError.style.display = "none";
        // keep selected color
        document.getElementById('startTime').value = "08:00";
        document.getElementById('endTime').value = "10:00";
        
        renderClassesList();
        renderTimetable();
    });
    
    // --- Rendering logic ---
    function renderClassesList() {
        classesList.innerHTML = '';
        
        if (classes.length === 0) {
            classesList.innerHTML = '<li style="text-align:center; color:#9fa6b2; padding: 1rem 0;">No hay clases agregadas.</li>';
            return;
        }
        
        // Sort by day then time
        const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const sorted = [...classes].sort((a, b) => {
            if (dayMap[a.day] !== dayMap[b.day]) return dayMap[a.day] - dayMap[b.day];
            return a.startTime.localeCompare(b.startTime);
        });
        
        const dayNames = {
            monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", 
            thursday: "Jueves", friday: "Viernes", saturday: "Sábado"
        };
        
        sorted.forEach(cls => {
            const li = document.createElement('li');
            li.className = 'class-list-item';
            
            const info = document.createElement('div');
            info.className = 'class-list-info';
            info.innerHTML = `
                <strong style="color: ${cls.color}">${cls.subject}</strong>
                <span>${dayNames[cls.day]} | ${t24to12(cls.startTime)} - ${t24to12(cls.endTime)}</span>
            `;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.title = 'Eliminar';
            delBtn.onclick = () => {
                deleteClass(cls.id);
            };
            
            li.appendChild(info);
            li.appendChild(delBtn);
            classesList.appendChild(li);
        });
    }
    
    function renderTimetable() {
        // Clear all columns
        const dayCols = document.querySelectorAll('.day-column');
        dayCols.forEach(col => col.innerHTML = '');
        
        classes.forEach(cls => {
            const col = document.querySelector(`.day-column[data-day="${cls.day}"]`);
            if (!col) return;
            
            // Calculate top and height
            const startMins = timeToMinutes(cls.startTime) - (START_HOUR * 60);
            const durationMins = timeToMinutes(cls.endTime) - timeToMinutes(cls.startTime);
            
            const topPx = (startMins / 60) * HOUR_HEIGHT;
            const heightPx = (durationMins / 60) * HOUR_HEIGHT;
            
            const div = document.createElement('div');
            div.className = 'class-block';
            div.style.backgroundColor = cls.color;
            div.style.top = `${topPx}px`;
            div.style.height = `${heightPx}px`;
            
            div.innerHTML = `
                <div class="class-block-title">${cls.subject}</div>
                ${cls.professor ? `<div class="class-block-info">${cls.professor}</div>` : ''}
                <div class="class-block-time">${t24to12(cls.startTime)} - ${t24to12(cls.endTime)}</div>
                <div class="delete-class-x" onclick="window.deleteClassHandler('${cls.id}')">×</div>
            `;
            
            col.appendChild(div);
        });
    }
    
    // --- Helpers ---
    function t24to12(time24) {
        const [h, m] = time24.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        if (hour === 0) hour = 12;
        return `${hour}:${m} ${ampm}`;
    }
    
    function timeToMinutes(time24) {
        const [h, m] = time24.split(':');
        return parseInt(h, 10) * 60 + parseInt(m, 10);
    }
    
    function deleteClass(id) {
        classes = classes.filter(c => c.id !== id);
        saveData();
        renderClassesList();
        renderTimetable();
    }
    
    // Expose for inline onclick
    window.deleteClassHandler = function(id) {
        deleteClass(id);
    };
    
    function saveData() {
        localStorage.setItem('ucc_timetable_classes', JSON.stringify(classes));
    }
    
    // --- Actions ---
    clearBtn.addEventListener('click', () => {
        if(confirm("¿Estás seguro de que deseas eliminar todo el horario?")) {
            classes = [];
            saveData();
            renderClassesList();
            renderTimetable();
        }
    });
    
    printBtn.addEventListener('click', () => {
        window.print();
    });
    
    // Add print styles dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        @media print {
            body { background: white; }
            .sidebar { display: none !important; }
            .app-header { display: none !important; }
            .app-wrapper { grid-template-columns: 1fr; margin: 0; padding: 0;}
            .card { border: none; box-shadow: none; padding: 0;}
            .class-block { box-shadow: none !important; border: 1px solid rgba(0,0,0,0.1); }
            @page { size: landscape; margin: 1cm; }
        }
    `;
    document.head.appendChild(style);
});
