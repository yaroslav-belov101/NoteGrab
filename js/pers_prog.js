const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const studyTasksList = document.getElementById('studyTasksList');
    const emptyState = document.getElementById('emptyState');
    const totalTasks = document.getElementById('totalTasks');
    const pendingTasks = document.getElementById('pendingTasks');
    const urgentTasks = document.getElementById('urgentTasks');
    const completedTasks = document.getElementById('completedTasks');
    const tasksSummary = document.getElementById('tasksSummary');
    const filterStatus = document.getElementById('filterStatus');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');
    const syncBtn = document.getElementById('syncBtn');

    let studyTasks = [];
    let filteredTasks = [];

    async function init() {
        console.log('🔄 Инициализация индивидуальной программы...');
        await loadStudyTasks();
        setupEventListeners();
        updateTasksDisplay();
    }

    async function loadStudyTasks() {
        console.log('📥 Загрузка учебных задач...');
        
        showLoadingState();
        
        try {
            // Загружаем учебные задачи из study_program.json
            const studyData = await ipcRenderer.invoke('read-file', 'data_plan/study_program.json');
            console.log('📄 Получены данные учебных задач:', studyData);
            
            let parsedData;
            try {
                parsedData = JSON.parse(studyData);
                if (parsedData.success !== undefined) {
                    if (parsedData.success && parsedData.content) {
                        parsedData = JSON.parse(parsedData.content);
                    } else {
                        throw new Error(parsedData.error || 'Invalid data format');
                    }
                }
            } catch (parseError) {
                console.error('❌ Ошибка парсинга учебных задач:', parseError);
                parsedData = typeof studyData === 'string' ? JSON.parse(studyData) : studyData;
            }
            
            studyTasks = parsedData.tasks || [];
            console.log('✅ Загружено учебных задач:', studyTasks.length);
            
            updateStats();
            updateTasksDisplay();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки учебных задач:', error);
            // Если файла нет, пробуем загрузить из planner.json и отфильтровать учебные задачи
            await loadFromPlanner();
        }
    }

    async function loadFromPlanner() {
        try {
            console.log('🔄 Попытка загрузки из планнера...');
            const plannerData = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            
            let parsedPlannerData;
            try {
                parsedPlannerData = JSON.parse(plannerData);
                if (parsedPlannerData.success !== undefined && parsedPlannerData.success && parsedPlannerData.content) {
                    parsedPlannerData = JSON.parse(parsedPlannerData.content);
                }
            } catch (parseError) {
                parsedPlannerData = typeof plannerData === 'string' ? JSON.parse(plannerData) : plannerData;
            }
            
            const plannerTasks = parsedPlannerData.tasks || [];
            console.log('📋 Задачи из планнера:', plannerTasks.length);
            
            // Фильтруем только учебные задачи (с тегом study)
            studyTasks = plannerTasks.filter(task => task.tag === 'study');
            console.log('🎓 Учебные задачи из планнера:', studyTasks.length);
            
            // Сохраняем в study_program.json для будущего использования
            await saveStudyTasks();
            
            updateStats();
            updateTasksDisplay();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из планнера:', error);
            loadFromLocalStorage();
        }
    }

    function loadFromLocalStorage() {
        console.log('📁 Загрузка из localStorage...');
        const savedTasks = localStorage.getItem('studyTasks_fallback');
        
        if (savedTasks) {
            try {
                studyTasks = JSON.parse(savedTasks);
                console.log('✅ Учебные задачи загружены из localStorage:', studyTasks.length);
                updateStats();
                updateTasksDisplay();
                showMessage('Задачи загружены из резервной копии', 'info');
            } catch (error) {
                console.error('❌ Ошибка парсинга localStorage:', error);
                studyTasks = [];
                updateTasksDisplay();
            }
        } else {
            studyTasks = [];
            updateTasksDisplay();
        }
    }

    async function saveStudyTasks() {
        try {
            const studyData = {
                tasks: studyTasks,
                lastUpdated: new Date().toISOString(),
                stats: {
                    total: studyTasks.length,
                    pending: studyTasks.filter(task => !task.completed).length,
                    completed: studyTasks.filter(task => task.completed).length
                }
            };

            await ipcRenderer.invoke('write-file', 'data_plan/study_program.json', JSON.stringify(studyData, null, 2));
            console.log('💾 Учебные задачи сохранены в study_program.json');
            
            localStorage.setItem('studyTasks_fallback', JSON.stringify(studyTasks));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения учебных задач:', error);
            localStorage.setItem('studyTasks_fallback', JSON.stringify(studyTasks));
        }
    }

    function updateStats() {
        const total = studyTasks.length;
        const pending = studyTasks.filter(task => !task.completed).length;
        const urgent = studyTasks.filter(task => 
            !task.completed && calculateTaskPriority(task) === 3
        ).length;
        const completed = studyTasks.filter(task => task.completed).length;
        
        if (totalTasks) totalTasks.textContent = total;
        if (pendingTasks) pendingTasks.textContent = pending;
        if (urgentTasks) urgentTasks.textContent = urgent;
        if (completedTasks) completedTasks.textContent = completed;
        
        updateTasksSummary();
    }

    function calculateTaskPriority(task) {
        const text = task.text.toLowerCase();
        let priority = 1;
        
        if (text.includes('срочно') || text.includes('urgent') || text.includes('важно')) {
            priority = 3;
        }
        else if (text.includes('экзамен') || text.includes('exam') || text.includes('тест')) {
            priority = 2;
        }
        
        if (task.date) {
            const taskDate = parseDate(task.date);
            const today = new Date();
            const daysUntilDue = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue <= 1) priority = Math.max(priority, 3);
            else if (daysUntilDue <= 3) priority = Math.max(priority, 2);
        }
        
        return priority;
    }

    function parseDate(dateString) {
        if (!dateString) return new Date();
        
        if (dateString.includes('.')) {
            const parts = dateString.split('.');
            if (parts.length === 3) {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
        
        if (dateString.includes('-')) {
            return new Date(dateString);
        }
        
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? new Date() : date;
    }

    function formatDisplayDate(date) {
        if (!date) return 'Нет даты';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Некорректная дата';
        
        return d.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function updateTasksSummary() {
        if (!tasksSummary) return;
        
        const pending = studyTasks.filter(task => !task.completed).length;
        const urgent = studyTasks.filter(task => 
            !task.completed && calculateTaskPriority(task) === 3
        ).length;
        
        let summaryText = '';
        if (studyTasks.length === 0) {
            summaryText = 'Нет учебных заданий';
        } else if (urgent > 0) {
            summaryText = `${urgent} срочных заданий, всего ${pending} активных`;
        } else if (pending > 0) {
            summaryText = `${pending} активных заданий`;
        } else {
            summaryText = 'Все задания выполнены! 🎉';
        }
        
        tasksSummary.textContent = summaryText;
    }

    function filterAndSortTasks() {
        const statusFilter = filterStatus ? filterStatus.value : 'all';
        const sortOption = sortBy ? sortBy.value : 'deadline';
        
        filteredTasks = studyTasks.filter(task => {
            switch (statusFilter) {
                case 'pending':
                    return !task.completed;
                case 'completed':
                    return task.completed;
                case 'urgent':
                    return !task.completed && calculateTaskPriority(task) === 3;
                default:
                    return true;
            }
        });
        
        filteredTasks.sort((a, b) => {
            switch (sortOption) {
                case 'priority':
                    return b.priority - a.priority;
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'deadline':
                default:
                    const dateA = parseDate(a.date);
                    const dateB = parseDate(b.date);
                    return dateA - dateB;
            }
        });
    }

    function updateTasksDisplay() {
        if (!studyTasksList) return;
        
        filterAndSortTasks();
        
        if (filteredTasks.length === 0) {
            showEmptyState();
            return;
        }
        
        hideEmptyState();
        
        studyTasksList.innerHTML = filteredTasks.map(task => `
            <div class="study-task-item ${task.completed ? 'study-task-item--completed' : ''} 
                         ${calculateTaskPriority(task) === 3 && !task.completed ? 'study-task-item--urgent' : ''}" 
                 data-task-id="${task.id}">
                <div class="study-task-header">
                    <div class="study-task-main">
                        <h3 class="study-task-title">${escapeHtml(task.text)}</h3>
                        <div class="study-task-meta">
                            <span class="study-task-date">📅 ${formatDisplayDate(parseDate(task.date))}</span>
                            ${calculateTaskPriority(task) === 3 ? '<span class="study-task-priority urgent">СРОЧНО</span>' : ''}
                            ${calculateTaskPriority(task) === 2 ? '<span class="study-task-priority high">ВЫСОКИЙ</span>' : ''}
                        </div>
                    </div>
                    <div class="study-task-actions">
                        <button class="study-task-complete-btn" title="${task.completed ? 'Вернуть в работу' : 'Отметить как выполненную'}">
                            ${task.completed ? '↶' : '✓'}
                        </button>
                        <button class="study-task-delete-btn" title="Удалить задачу">×</button>
                    </div>
                </div>
                <div class="study-task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.completed ? '100' : '0'}%"></div>
                    </div>
                    <span class="progress-text">${task.completed ? 'Выполнено' : 'В процессе'}</span>
                </div>
            </div>
        `).join('');
        
        attachTaskEventHandlers();
    }

    function attachTaskEventHandlers() {
        const completeButtons = studyTasksList.querySelectorAll('.study-task-complete-btn');
        completeButtons.forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });

        const newCompleteButtons = studyTasksList.querySelectorAll('.study-task-complete-btn');
        newCompleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const taskItem = this.closest('.study-task-item');
                const taskId = taskItem.getAttribute('data-task-id');
                console.log('✅ Кнопка выполнения нажата для учебной задачи ID:', taskId);
                
                toggleTaskCompletion(taskId);
            });
        });

        const deleteButtons = studyTasksList.querySelectorAll('.study-task-delete-btn');
        deleteButtons.forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });

        const newDeleteButtons = studyTasksList.querySelectorAll('.study-task-delete-btn');
        newDeleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const taskItem = this.closest('.study-task-item');
                const taskId = taskItem.getAttribute('data-task-id');
                console.log('🗑️ Кнопка удаления нажата для учебной задачи ID:', taskId);
                
                deleteStudyTask(taskId);
            });
        });
    }

    async function toggleTaskCompletion(taskId) {
        console.log('🔄 Переключение статуса учебной задачи ID:', taskId);
        
        const taskIndex = studyTasks.findIndex(task => task.id == taskId);
        console.log('📊 Найден индекс задачи:', taskIndex);
        
        if (taskIndex !== -1) {
            studyTasks[taskIndex].completed = !studyTasks[taskIndex].completed;
            studyTasks[taskIndex].updatedAt = new Date().toISOString();
            
            console.log('📝 Новый статус задачи:', studyTasks[taskIndex].completed);
            
            await saveStudyTasks();
            updateStats();
            updateTasksDisplay();
            
            const action = studyTasks[taskIndex].completed ? 'выполнена' : 'возвращена в работу';
            showMessage(`Учебная задача "${studyTasks[taskIndex].text}" ${action}`, 'success');
        } else {
            console.error('❌ Учебная задача не найдена для переключения статуса');
            showMessage('Ошибка: учебная задача не найдена', 'error');
        }
    }

    async function deleteStudyTask(taskId) {
        console.log('🗑️ Удаление учебной задачи ID:', taskId);
        
        const taskIndex = studyTasks.findIndex(task => task.id == taskId);
        console.log('📊 Найден индекс задачи для удаления:', taskIndex);
        
        if (taskIndex !== -1) {
            const taskText = studyTasks[taskIndex].text;
            console.log('📝 Удаляемая учебная задача:', taskText);
            
            studyTasks = studyTasks.filter(task => task.id != taskId);
            console.log('✅ Задача удалена из массива, осталось задач:', studyTasks.length);
            
            await saveStudyTasks();
            updateStats();
            updateTasksDisplay();
            
            showMessage(`Учебная задача "${taskText}" удалена`, 'info');
        } else {
            console.error('❌ Учебная задача не найдена для удаления');
            showMessage('Ошибка: учебная задача не найдена', 'error');
        }
    }

    async function syncWithPlanner() {
        console.log('🔄 Синхронизация с планнером...');
        showMessage('Синхронизация...', 'info');
        
        try {
            await loadStudyTasks();
            showMessage('Синхронизация завершена успешно!', 'success');
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            showMessage('Ошибка синхронизации', 'error');
        }
    }

    function setupEventListeners() {
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadStudyTasks();
                showMessage('Список задач обновлен', 'info');
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', syncWithPlanner);
        }

        if (filterStatus) {
            filterStatus.addEventListener('change', updateTasksDisplay);
        }

        if (sortBy) {
            sortBy.addEventListener('change', updateTasksDisplay);
        }

        console.log('✅ Обработчики событий установлены');
    }

    function showLoadingState() {
        if (studyTasksList) {
            studyTasksList.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Загрузка учебных заданий...</p>
                </div>
            `;
        }
    }

    function showEmptyState() {
        if (studyTasksList) studyTasksList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }

    function hideEmptyState() {
        if (studyTasksList) studyTasksList.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
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

    // Функция для синхронизации удалений с планнером
    async function syncDeletionsWithPlanner() {
        try {
            console.log('🔄 Синхронизация удалений с планнером...');
            const plannerData = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            
            let parsedPlannerData;
            try {
                parsedPlannerData = JSON.parse(plannerData);
                if (parsedPlannerData.success !== undefined && parsedPlannerData.success && parsedPlannerData.content) {
                    parsedPlannerData = JSON.parse(parsedPlannerData.content);
                }
            } catch (parseError) {
                parsedPlannerData = typeof plannerData === 'string' ? JSON.parse(plannerData) : plannerData;
            }
            
            const plannerTasks = parsedPlannerData.tasks || [];
            
            // Удаляем задачи, которых нет в планнере
            const plannerTaskIds = plannerTasks.map(task => task.id);
            studyTasks = studyTasks.filter(task => plannerTaskIds.includes(task.id));
            
            console.log('✅ Удаления синхронизированы с планнером');
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации удалений с планнером:', error);
        }
    }

    // Функция для синхронизации статусов выполнения с планнером
    async function syncCompletionWithPlanner() {
        try {
            console.log('🔄 Синхронизация статусов выполнения с планнером...');
            const plannerData = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            
            let parsedPlannerData;
            try {
                parsedPlannerData = JSON.parse(plannerData);
                if (parsedPlannerData.success !== undefined && parsedPlannerData.success && parsedPlannerData.content) {
                    parsedPlannerData = JSON.parse(parsedPlannerData.content);
                }
            } catch (parseError) {
                parsedPlannerData = typeof plannerData === 'string' ? JSON.parse(plannerData) : plannerData;
            }
            
            const plannerTasks = parsedPlannerData.tasks || [];
            
            // Синхронизируем статусы выполнения
            studyTasks.forEach(studyTask => {
                const plannerTask = plannerTasks.find(task => task.id === studyTask.id);
                if (plannerTask) {
                    studyTask.completed = plannerTask.completed;
                    studyTask.updatedAt = plannerTask.updatedAt;
                }
            });
            
            console.log('✅ Статусы выполнения синхронизированы с планнером');
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации статусов с планнером:', error);
        }
    }

    // Обновите функцию loadStudyTasks() для полной синхронизации
    async function loadStudyTasks() {
        console.log('📥 Загрузка учебных задач...');
        showLoadingState();
        try {
            // Сначала загружаем из study_program.json
            const studyData = await ipcRenderer.invoke('read-file', 'data_plan/study_program.json');
            console.log('📄 Получены данные учебных задач:', studyData);
            
            let parsedData;
            try {
                parsedData = JSON.parse(studyData);
                if (parsedData.success !== undefined) {
                    if (parsedData.success && parsedData.content) {
                        parsedData = JSON.parse(parsedData.content);
                    } else {
                        throw new Error(parsedData.error || 'Invalid data format');
                    }
                }
            } catch (parseError) {
                console.error('❌ Ошибка парсинга учебных задач:', parseError);
                parsedData = typeof studyData === 'string' ? JSON.parse(studyData) : studyData;
            }
            
            studyTasks = parsedData.tasks || [];
            console.log('✅ Загружено учебных задач:', studyTasks.length);
            
            // Синхронизируем с планнером
            await syncDeletionsWithPlanner();
            await syncCompletionWithPlanner();
            
            updateStats();
            updateTasksDisplay();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки учебных задач:', error);
            await loadFromPlanner();
        }
    }

    // Обновите функцию toggleTaskCompletion() для двусторонней синхронизации
    async function toggleTaskCompletion(taskId) {
        console.log('🔄 Переключение статуса учебной задачи ID:', taskId);
        
        const taskIndex = studyTasks.findIndex(task => task.id == taskId);
        console.log('📊 Найден индекс задачи:', taskIndex);
        
        if (taskIndex !== -1) {
            studyTasks[taskIndex].completed = !studyTasks[taskIndex].completed;
            studyTasks[taskIndex].updatedAt = new Date().toISOString();
            
            console.log('📝 Новый статус задачи:', studyTasks[taskIndex].completed);
            
            // Сохраняем в индивидуальной программе
            await saveStudyTasks();
            
            // Синхронизируем с планнером
            await syncCompletionWithPlannerInReverse();
            
            updateStats();
            updateTasksDisplay();
            
            const action = studyTasks[taskIndex].completed ? 'выполнена' : 'возвращена в работу';
            showMessage(`Учебная задача "${studyTasks[taskIndex].text}" ${action} (синхронизировано с планнером)`, 'success');
        } else {
            console.error('❌ Учебная задача не найдена для переключения статуса');
            showMessage('Ошибка: учебная задача не найдена', 'error');
        }
    }

    // Функция для обратной синхронизации статусов выполнения с планнером
    async function syncCompletionWithPlannerInReverse() {
        try {
            console.log('🔄 Обратная синхронизация статусов с планнером...');
            const plannerData = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            
            let parsedPlannerData;
            try {
                parsedPlannerData = JSON.parse(plannerData);
                if (parsedPlannerData.success !== undefined && parsedPlannerData.success && parsedPlannerData.content) {
                    parsedPlannerData = JSON.parse(parsedPlannerData.content);
                }
            } catch (parseError) {
                parsedPlannerData = typeof plannerData === 'string' ? JSON.parse(plannerData) : plannerData;
            }
            
            let plannerTasks = parsedPlannerData.tasks || [];
            
            // Обновляем статусы выполнения в планнере
            studyTasks.forEach(studyTask => {
                const plannerTaskIndex = plannerTasks.findIndex(task => task.id === studyTask.id);
                if (plannerTaskIndex !== -1) {
                    plannerTasks[plannerTaskIndex].completed = studyTask.completed;
                    plannerTasks[plannerTaskIndex].updatedAt = studyTask.updatedAt;
                }
            });
            
            // Сохраняем обновленный планнер
            const updatedPlannerData = {
                ...parsedPlannerData,
                tasks: plannerTasks,
                lastUpdated: new Date().toISOString()
            };
            
            await ipcRenderer.invoke('write-file', 'data_plan/planner.json', JSON.stringify(updatedPlannerData, null, 2));
            console.log('✅ Статусы выполнения синхронизированы с планнером (обратная синхронизация)');
            
        } catch (error) {
            console.error('❌ Ошибка обратной синхронизации с планнером:', error);
        }
    }

    // Обновите функцию deleteStudyTask() для двусторонней синхронизации
    async function deleteStudyTask(taskId) {
        console.log('🗑️ Удаление учебной задачи ID:', taskId);
        
        const taskIndex = studyTasks.findIndex(task => task.id == taskId);
        console.log('📊 Найден индекс задачи для удаления:', taskIndex);
        
        if (taskIndex !== -1) {
            const taskText = studyTasks[taskIndex].text;
            console.log('📝 Удаляемая учебная задача:', taskText);
            
            studyTasks = studyTasks.filter(task => task.id != taskId);
            console.log('✅ Задача удалена из массива, осталось задач:', studyTasks.length);
            
            // Сохраняем в индивидуальной программе
            await saveStudyTasks();
            
            // Удаляем из планнера
            await deleteFromPlanner(taskId);
            
            updateStats();
            updateTasksDisplay();
            
            showMessage(`Учебная задача "${taskText}" удалена из индивидуальной программы и планнера`, 'info');
        } else {
            console.error('❌ Учебная задача не найдена для удаления');
            showMessage('Ошибка: учебная задача не найдена', 'error');
        }
    }

    // Функция для удаления задачи из планнера
    async function deleteFromPlanner(taskId) {
        try {
            console.log('🗑️ Удаление задачи из планнера ID:', taskId);
            const plannerData = await ipcRenderer.invoke('read-file', 'data_plan/planner.json');
            
            let parsedPlannerData;
            try {
                parsedPlannerData = JSON.parse(plannerData);
                if (parsedPlannerData.success !== undefined && parsedPlannerData.success && parsedPlannerData.content) {
                    parsedPlannerData = JSON.parse(parsedPlannerData.content);
                }
            } catch (parseError) {
                parsedPlannerData = typeof plannerData === 'string' ? JSON.parse(plannerData) : plannerData;
            }
            
            let plannerTasks = parsedPlannerData.tasks || [];
            
            // Удаляем задачу из планнера
            plannerTasks = plannerTasks.filter(task => task.id != taskId);
            
            // Сохраняем обновленный планнер
            const updatedPlannerData = {
                ...parsedPlannerData,
                tasks: plannerTasks,
                lastUpdated: new Date().toISOString()
            };
            
            await ipcRenderer.invoke('write-file', 'data_plan/planner.json', JSON.stringify(updatedPlannerData, null, 2));
            console.log('✅ Задача удалена из планнера');
            
        } catch (error) {
            console.error('❌ Ошибка удаления из планнера:', error);
        }
    }

        // Запускаем
        init();
    });