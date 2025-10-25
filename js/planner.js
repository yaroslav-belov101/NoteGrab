const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const displayMonthElement = document.getElementById('displayMonth');
    const displayYearElement = document.getElementById('displayYear');
    const currentMonthYearElement = document.getElementById('currentMonthYear');
    const calendarDaysElement = document.getElementById('calendarDays');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const tasksList = document.getElementById('tasksList');

    const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", 
                   "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();
    let currentDay = currentDate.getDate();
    let tasks = [];
    let selectedDay = currentDay;

    async function init() {
        console.log('🔄 Инициализация планнера...');
        await loadTasks();
        setupEventListeners();
        updateCalendar();
    }

    async function loadTasks() {
        console.log('📥 Загрузка задач...');
        
        showLoadingState();
        
        try {
            const data = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            console.log('📄 Получены данные:', data);
            
            let parsedData;
            try {
                parsedData = JSON.parse(data);
                if (parsedData.success !== undefined) {
                    if (parsedData.success && parsedData.content) {
                        parsedData = JSON.parse(parsedData.content);
                    } else {
                        throw new Error(parsedData.error || 'Invalid data format');
                    }
                }
            } catch (parseError) {
                console.error('❌ Ошибка парсинга данных:', parseError);
                parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            }
            
            tasks = parsedData.tasks || [];
            console.log('✅ Загружено задач:', tasks.length);
            updateTasksDisplay();
        } catch (error) {
            console.error('❌ Ошибка загрузки из файла:', error);
            loadFromLocalStorage();
        }
    }

    function loadFromLocalStorage() {
        console.log('📁 Загрузка из localStorage...');
        const savedTasks = localStorage.getItem('plannerTasks_fallback');
        
        if (savedTasks) {
            try {
                tasks = JSON.parse(savedTasks);
                console.log('✅ Задачи загружены из localStorage:', tasks.length);
                updateTasksDisplay();
                showMessage('Задачи загружены из резервной копии', 'info');
            } catch (error) {
                console.error('❌ Ошибка парсинга localStorage:', error);
                tasks = [];
                updateTasksDisplay();
            }
        } else {
            tasks = [];
            updateTasksDisplay();
        }
    }

    async function saveTasks() {
        try {
            const plannerData = {
                tasks: tasks,
                lastUpdated: new Date().toISOString(),
                currentView: {
                    year: currentYear,
                    month: currentMonth,
                    day: selectedDay
                }
            };

            const result = await ipcRenderer.invoke('write-file', 'data_plan/planner.json', JSON.stringify(plannerData, null, 2));
            console.log('💾 Результат сохранения:', result);
            
            let saveResult;
            try {
                saveResult = JSON.parse(result);
            } catch {
                saveResult = { success: true };
            }
            
            if (saveResult.success) {
                console.log('✅ Задачи сохранены в файл');
            } else {
                throw new Error(saveResult.error || 'Unknown save error');
            }
            
            localStorage.setItem('plannerTasks_fallback', JSON.stringify(tasks));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения в файл:', error);
            localStorage.setItem('plannerTasks_fallback', JSON.stringify(tasks));
            showMessage('Ошибка сохранения в файл, данные сохранены локально', 'error');
        }
    }

    function showLoadingState() {
        if (tasksList) {
            tasksList.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner"></div>
                    <p style="color: #94a3b8; margin-top: 15px;">Загрузка задач...</p>
                </div>
            `;
        }
    }

    function updateCalendar() {
        if (displayMonthElement) displayMonthElement.textContent = months[currentMonth];
        if (displayYearElement) displayYearElement.textContent = currentYear;
        if (currentMonthYearElement) currentMonthYearElement.textContent = `${months[currentMonth]} ${currentYear}`;
        
        renderCalendar();
    }

    function renderCalendar() {
        if (!calendarDaysElement) return;
        
        calendarDaysElement.innerHTML = '';
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        console.log(`📅 Отрисовка календаря: ${months[currentMonth]} ${currentYear}, дней: ${daysInMonth}, начало: ${startDay}`);
        
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('calendar__day-number', 'calendar__day-number--other');
            calendarDaysElement.appendChild(emptyDay);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar__day-number');
            dayElement.textContent = i;
            
            const isToday = i === currentDate.getDate() && 
                           currentYear === currentDate.getFullYear() && 
                           currentMonth === currentDate.getMonth();
            
            const isSelected = i === selectedDay;
            
            if (isToday) {
                dayElement.classList.add('calendar__day-number--current');
            }
            
            if (isSelected) {
                dayElement.classList.add('calendar__day-number--selected');
            }
            
            const taskDate = formatDate(i, currentMonth, currentYear);
            const dayTasks = tasks.filter(task => task.date === taskDate && !task.completed);
            if (dayTasks.length > 0) {
                dayElement.classList.add('calendar__day-number--has-tasks');
                const taskIndicator = document.createElement('div');
                taskIndicator.classList.add('task-indicator');
                taskIndicator.textContent = dayTasks.length;
                dayElement.appendChild(taskIndicator);
            }
            
            dayElement.addEventListener('click', () => selectDay(i));
            calendarDaysElement.appendChild(dayElement);
        }
    }

    function formatDate(day, month, year) {
        return `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
    }

    function selectDay(day) {
        console.log(`📌 Выбран день: ${day}`);
        selectedDay = day;
        
        const allDays = document.querySelectorAll('.calendar__day-number');
        allDays.forEach(d => {
            d.classList.remove('calendar__day-number--selected');
        });
        
        const selectedDayElement = Array.from(allDays).find(d => {
            const dayNumber = parseInt(d.textContent);
            return !isNaN(dayNumber) && dayNumber === day && 
                   !d.classList.contains('calendar__day-number--other');
        });
        
        if (selectedDayElement) {
            selectedDayElement.classList.add('calendar__day-number--selected');
        }
        
        updateTasksDisplay();
    }

    function setupEventListeners() {
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                selectedDay = 1;
                updateCalendar();
                updateTasksDisplay();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                selectedDay = 1;
                updateCalendar();
                updateTasksDisplay();
            });
        }

        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', addTask);
        }
        
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addTask();
                }
            });
        }

        console.log('✅ Обработчики событий установлены');
    }

    async function addTask() {
        const taskText = taskInput?.value.trim();
        if (!taskText) {
            showMessage('Введите текст задачи', 'error');
            return;
        }
        
        const taskDate = formatDate(selectedDay, currentMonth, currentYear);
        const task = {
            id: Date.now() + Math.random(),
            text: taskText,
            date: taskDate,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        console.log('➕ Добавление задачи:', task);
        
        tasks.push(task);
        await saveTasks();
        
        if (taskInput) {
            taskInput.value = '';
            taskInput.focus();
        }
        
        updateCalendar();
        updateTasksDisplay();
        
        showMessage('Задача добавлена!', 'success');
    }

    function updateTasksDisplay() {
        if (!tasksList) return;
        
        const currentTaskDate = formatDate(selectedDay, currentMonth, currentYear);
        const dayTasks = tasks.filter(task => task.date === currentTaskDate);
        
        console.log(`📋 Задачи на ${currentTaskDate}:`, dayTasks.length);
        
        if (dayTasks.length === 0) {
            showEmptyTasks();
            return;
        }
        
        dayTasks.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        tasksList.innerHTML = dayTasks.map(task => `
            <div class="task-item ${task.completed ? 'task-item--completed' : ''}" data-task-id="${task.id}">
                <span class="task-text">${escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="task-complete-btn" title="${task.completed ? 'Вернуть в работу' : 'Отметить как выполненную'}">
                        ${task.completed ? '↶' : '✓'}
                    </button>
                    <button class="task-delete-btn" title="Удалить задачу">×</button>
                </div>
            </div>
        `).join('');
        
        // Исправленные обработчики событий
        attachTaskEventHandlers();
    }

    function attachTaskEventHandlers() {
        // Обработчики для кнопок выполнения задач
        const completeButtons = tasksList.querySelectorAll('.task-complete-btn');
        completeButtons.forEach(button => {
            // Удаляем старые обработчики
            button.replaceWith(button.cloneNode(true));
        });

        // Добавляем новые обработчики
        const newCompleteButtons = tasksList.querySelectorAll('.task-complete-btn');
        newCompleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const taskItem = this.closest('.task-item');
                const taskId = parseFloat(taskItem.getAttribute('data-task-id'));
                console.log('✅ Кнопка выполнения нажата для задачи ID:', taskId);
                
                toggleTaskCompletion(taskId);
            });
        });

        // Обработчики для кнопок удаления задач
        const deleteButtons = tasksList.querySelectorAll('.task-delete-btn');
        deleteButtons.forEach(button => {
            // Удаляем старые обработчики
            button.replaceWith(button.cloneNode(true));
        });

        // Добавляем новые обработчики
        const newDeleteButtons = tasksList.querySelectorAll('.task-delete-btn');
        newDeleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const taskItem = this.closest('.task-item');
                const taskId = parseFloat(taskItem.getAttribute('data-task-id'));
                console.log('🗑️ Кнопка удаления нажата для задачи ID:', taskId);
                
                deleteTask(taskId);
            });
        });

        console.log(`🎯 Добавлено обработчиков: ${newCompleteButtons.length} для выполнения, ${newDeleteButtons.length} для удаления`);
    }

    function showEmptyTasks() {
        if (tasksList) {
            tasksList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                    <div class="empty-icon" style="font-size: 48px; margin-bottom: 15px;">📝</div>
                    <h3 style="color: #fff; margin-bottom: 10px;">Нет задач на этот день</h3>
                    <p style="color: #94a3b8;">Добавьте первую задачу</p>
                </div>
            `;
        }
    }

    async function toggleTaskCompletion(taskId) {
        console.log('🔄 Переключение статуса задачи ID:', taskId);
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        console.log('📊 Найден индекс задачи:', taskIndex);
        
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            tasks[taskIndex].updatedAt = new Date().toISOString();
            
            console.log('📝 Новый статус задачи:', tasks[taskIndex].completed);
            
            await saveTasks();
            updateCalendar();
            updateTasksDisplay();
            
            const action = tasks[taskIndex].completed ? 'выполнена' : 'возвращена в работу';
            showMessage(`Задача "${tasks[taskIndex].text}" ${action}`, 'success');
        } else {
            console.error('❌ Задача не найдена для переключения статуса');
            showMessage('Ошибка: задача не найдена', 'error');
        }
    }

    async function deleteTask(taskId) {
        console.log('🗑️ Удаление задачи ID:', taskId);
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        console.log('📊 Найден индекс задачи для удаления:', taskIndex);
        
        if (taskIndex !== -1) {
            const taskText = tasks[taskIndex].text;
            console.log('📝 Удаляемая задача:', taskText);
            
            tasks = tasks.filter(task => task.id !== taskId);
            console.log('✅ Задача удалена из массива, осталось задач:', tasks.length);
            
            await saveTasks();
            updateCalendar();
            updateTasksDisplay();
            
            showMessage(`Задача "${taskText}" удалена`, 'info');
        } else {
            console.error('❌ Задача не найдена для удаления');
            showMessage('Ошибка: задача не найдена', 'error');
        }
    }

    function showMessage(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification-message');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = 'notification-message';
        const bgColor = type === 'success' ? '#10b981' : 
                       type === 'error' ? '#ef4444' : '#3b82f6';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 300px;
            font-weight: 500;
            font-size: 14px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #334155;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .task-indicator {
            position: absolute;
            top: 2px;
            right: 2px;
            background: #23839d;
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            line-height: 1;
        }
        .calendar__day-number {
            position: relative;
        }
        
        /* Стили для кнопок задач */
        .task-actions {
            display: flex;
            gap: 5px;
        }
        
        .task-complete-btn, .task-delete-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .task-complete-btn {
            color: #10b981;
            border: 1px solid #10b981;
        }
        
        .task-complete-btn:hover {
            background: #10b981;
            color: white;
        }
        
        .task-delete-btn {
            color: #ef4444;
            border: 1px solid #ef4444;
        }
        
        .task-delete-btn:hover {
            background: #ef4444;
            color: white;
        }
    `;
    document.head.appendChild(style);

    // Запускаем
    init();
});