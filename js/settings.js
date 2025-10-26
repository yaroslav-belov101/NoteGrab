// settings.js
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.currentSection = 'appearance';
        this.confirmCallback = null;
        this.initEventListeners();
        this.applySettings();
        this.populateSettings();
        this.showSection(this.currentSection);
    }
    
    loadSettings() {
        const defaultSettings = {
            // Внешний вид
            theme: 'dark',
            uiSize: 'normal',
            compactSidebar: false,
            accentColor: '#6366f1',
            
            // Данные
            dataPath: '/home/user/NoteGrab/data',
            autoSave: 60000,
            
            // Уведомления
            enableNotifications: true,
            taskReminders: true,
            backupReminders: false,
            soundEnabled: false,
            reminderTime: '09:00',
            
            // Резервные копии
            autoBackup: true,
            backupFrequency: 'weekly',
            backupPath: '/home/user/NoteGrab/backups',
            
            // Горячие клавиши
            shortcuts: {
                newNote: 'Ctrl+N',
                search: 'Ctrl+F',
                save: 'Ctrl+S',
                export: 'Ctrl+E'
            }
        };
        
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    
    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        this.applySettings();
        this.showNotification('Настройки сохранены!', 'success');
    }
    
    applySettings() {
        // Применение темы ко всему приложению
        this.applyTheme(this.settings.theme);
        
        // Применение акцентного цвета
        document.documentElement.style.setProperty('--accent-color', this.settings.accentColor);
        
        // Применение компактного сайдбара
        this.applyCompactSidebar(this.settings.compactSidebar);
        
        // Применение размера интерфейса
        this.applyUISize();
        
        // Сохраняем настройки для других страниц
        this.saveSettingsForOtherPages();
        
        // Отправляем событие для обновления на других страницах
        this.dispatchSettingsChangeEvent();
    }
    
    applyTheme(theme) {
        // Удаляем все классы тем
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-blue');
        // Добавляем текущую тему
        document.body.classList.add(`theme-${theme}`);
        
        // Сохраняем тему в глобальной переменной
        if (typeof window !== 'undefined') {
            window.currentTheme = theme;
        }
    }
    
    applyCompactSidebar(compactSidebar) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const pinButton = document.getElementById('pinToggle');
        
        if (!sidebar || !mainContent) return;
        
        if (compactSidebar) {
            // Активируем компактный режим
            sidebar.classList.remove('sidebar-pinned');
            sidebar.classList.add('sidebar-unpinned');
            mainContent.classList.remove('main-content-pinned');
            mainContent.classList.add('main-content-unpinned');
            
            // Обновляем состояние кнопки pin
            if (pinButton) {
                pinButton.classList.remove('pinned');
            }
        } else {
            // Активируем обычный режим
            sidebar.classList.remove('sidebar-unpinned');
            sidebar.classList.add('sidebar-pinned');
            mainContent.classList.remove('main-content-unpinned');
            mainContent.classList.add('main-content-pinned');
            
            // Обновляем состояние кнопки pin
            if (pinButton) {
                pinButton.classList.add('pinned');
            }
        }
    }
    
    dispatchSettingsChangeEvent() {
        // Создаем кастомное событие для уведомления других вкладок
        const event = new CustomEvent('settingsChanged', {
            detail: { 
                theme: this.settings.theme,
                accentColor: this.settings.accentColor,
                compactSidebar: this.settings.compactSidebar
            }
        });
        window.dispatchEvent(event);
        
        // Также сохраняем в localStorage для других вкладок
        localStorage.setItem('settingsUpdate', Date.now().toString());
    }
    
    saveSettingsForOtherPages() {
        // Сохраняем настройки в localStorage для доступа с других страниц
        const globalSettings = {
            theme: this.settings.theme,
            accentColor: this.settings.accentColor,
            compactSidebar: this.settings.compactSidebar
        };
        localStorage.setItem('globalAppSettings', JSON.stringify(globalSettings));
    }
    
    applyUISize() {
        const sizes = {
            compact: '0.9',
            normal: '1',
            large: '1.1'
        };
        document.documentElement.style.setProperty('--ui-scale', sizes[this.settings.uiSize] || '1');
    }
    
    applyShortcuts() {
        // В реальном приложении здесь будет логика применения горячих клавиш
        console.log('Горячие клавиши применены:', this.settings.shortcuts);
    }
    
    populateSettings() {
        // Заполняем значения из настроек
        this.setElementValue('uiSize', this.settings.uiSize);
        this.setElementValue('compactSidebar', this.settings.compactSidebar);
        this.setElementValue('accentColor', this.settings.accentColor);
        this.setElementValue('dataPath', this.settings.dataPath);
        this.setElementValue('autoSave', this.settings.autoSave);
        this.setElementValue('enableNotifications', this.settings.enableNotifications);
        this.setElementValue('taskReminders', this.settings.taskReminders);
        this.setElementValue('backupReminders', this.settings.backupReminders);
        this.setElementValue('soundEnabled', this.settings.soundEnabled);
        this.setElementValue('reminderTime', this.settings.reminderTime);
        this.setElementValue('autoBackup', this.settings.autoBackup);
        this.setElementValue('backupFrequency', this.settings.backupFrequency);
        this.setElementValue('backupPath', this.settings.backupPath);
        
        // Обновляем отображение цвета
        const colorValue = document.querySelector('.color-value');
        if (colorValue) {
            colorValue.textContent = this.settings.accentColor;
        }
        
        // Активируем текущую тему
        this.updateThemeSelection();
        
        // Заполняем горячие клавиши
        this.populateShortcuts();
    }
    
    setElementValue(id, value) {
        const element = document.getElementById(id);
        if (!element) return;
        
        if (element.type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
    }
    
    updateThemeSelection() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === this.settings.theme) {
                option.classList.add('active');
            }
        });
    }
    
    populateShortcuts() {
        // Заполняем горячие клавиши в интерфейсе
        const shortcuts = this.settings.shortcuts;
        const shortcutItems = document.querySelectorAll('.shortcut-item');
        
        shortcutItems.forEach(item => {
            const description = item.querySelector('.shortcut-description').textContent;
            const keysElement = item.querySelector('.shortcut-keys');
            
            if (!keysElement) return;
            
            if (description.includes('Новая заметка')) {
                keysElement.innerHTML = this.formatShortcutKeys(shortcuts.newNote);
            } else if (description.includes('Поиск')) {
                keysElement.innerHTML = this.formatShortcutKeys(shortcuts.search);
            } else if (description.includes('Сохранить')) {
                keysElement.innerHTML = this.formatShortcutKeys(shortcuts.save);
            } else if (description.includes('Экспорт')) {
                keysElement.innerHTML = this.formatShortcutKeys(shortcuts.export);
            }
        });
    }
    
    formatShortcutKeys(shortcut) {
        return shortcut.split('+')
            .map(key => `<kbd>${key.trim()}</kbd>`)
            .join(' + ');
    }
    
    initEventListeners() {
        // Навигация по разделам
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
        
        // Выбор темы (только 3 темы: dark, light, blue)
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.settings.theme = option.dataset.theme;
                this.saveSettings();
                this.updateThemeSelection();
            });
        });
        
        // Изменение цвета
        const accentColorInput = document.getElementById('accentColor');
        if (accentColorInput) {
            accentColorInput.addEventListener('input', (e) => {
                this.settings.accentColor = e.target.value;
                const colorValue = document.querySelector('.color-value');
                if (colorValue) {
                    colorValue.textContent = e.target.value;
                }
                this.saveSettings();
            });
        }
        
        // Сохранение настроек при изменении
        document.querySelectorAll('input, select').forEach(element => {
            if (element.id !== 'accentColor') {
                element.addEventListener('change', () => this.saveSetting(element));
            }
        });
        
        // Кнопки экспорта
        document.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', () => {
                this.exportData(btn.dataset.format);
            });
        });
        
        // Кнопка импорта
        const importBtn = document.querySelector('.btn-import');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importData();
            });
        }
        
        // Кнопка создания бэкапа
        const backupBtn = document.querySelector('.btn-backup-now');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }
        
        // Кнопка восстановления
        const restoreBtn = document.querySelector('.btn-restore');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                this.restoreBackup();
            });
        }
        
        // Опасные действия
        const clearDataBtn = document.getElementById('clearData');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.showConfirm(
                    'Очистить все данные', 
                    'Вы уверены, что хотите удалить все данные? Это действие нельзя отменить.',
                    () => this.clearData()
                );
            });
        }
        
        const resetSettingsBtn = document.getElementById('resetSettings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.showConfirm(
                    'Сбросить настройки', 
                    'Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?',
                    () => this.resetSettings()
                );
            });
        }
        
        // Редактирование горячих клавиш
        document.querySelectorAll('.btn-edit-shortcut').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const shortcutItem = e.target.closest('.shortcut-item');
                this.editShortcut(shortcutItem);
            });
        });
        
        // Сброс горячих клавиш
        const resetShortcutsBtn = document.querySelector('.btn-reset-shortcuts');
        if (resetShortcutsBtn) {
            resetShortcutsBtn.addEventListener('click', () => {
                this.showConfirm(
                    'Сбросить сочетания клавиш', 
                    'Сбросить все сочетания клавиш к значениям по умолчанию?',
                    () => this.resetShortcuts()
                );
            });
        }
        
        // Восстановление из бэкапа в истории
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-restore-backup')) {
                const backupItem = e.target.closest('.backup-item');
                const backupName = backupItem.querySelector('span:first-child').textContent;
                this.showConfirm(
                    'Восстановление из бэкапа',
                    `Восстановить данные из "${backupName}"? Текущие данные будут заменены.`,
                    () => this.restoreFromBackup(backupName)
                );
            }
        });
        
        // Модальное окно подтверждения
        const confirmCancel = document.getElementById('confirmCancel');
        const confirmOk = document.getElementById('confirmOk');
        const confirmModal = document.getElementById('confirmModal');
        
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => {
                this.hideConfirm();
            });
        }
        
        if (confirmOk) {
            confirmOk.addEventListener('click', () => {
                if (this.confirmCallback) {
                    this.confirmCallback();
                }
                this.hideConfirm();
            });
        }
        
        if (confirmModal) {
            confirmModal.addEventListener('click', (e) => {
                if (e.target.id === 'confirmModal') {
                    this.hideConfirm();
                }
            });
        }
        
        // Заполняем системную информацию
        this.populateSystemInfo();
        
        // Загружаем историю бэкапов
        this.loadBackupHistory();
    }
    
    showSection(sectionName) {
        // Скрыть все секции
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Показать выбранную секцию
        const sectionElement = document.getElementById(`${sectionName}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
        
        // Обновить активную навигацию
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        this.currentSection = sectionName;
        
        // Обновляем URL hash
        window.location.hash = sectionName;
    }
    
    saveSetting(element) {
        const key = element.id;
        let value;
        
        switch (element.type) {
            case 'checkbox':
                value = element.checked;
                break;
            case 'number':
                value = parseInt(element.value) || 0;
                break;
            case 'color':
                value = element.value;
                break;
            default:
                value = element.value;
        }
        
        // Специальная обработка для некоторых полей
        if (key === 'autoSave') {
            value = parseInt(value);
        }
        
        this.settings[key] = value;
        this.saveSettings();
    }
    
    exportData(format) {
        try {
            const data = {
                notes: this.getNotesData(),
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            let content, mimeType, extension;
            
            switch(format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                case 'markdown':
                    content = this.convertToMarkdown(data.notes);
                    mimeType = 'text/markdown';
                    extension = 'md';
                    break;
                default:
                    throw new Error('Неизвестный формат экспорта');
            }
            
            this.downloadFile(content, `notegrab-export-${this.getFormattedDate()}.${extension}`, mimeType);
            this.showNotification(`Данные экспортированы в ${format.toUpperCase()}!`, 'success');
            
        } catch (error) {
            this.showNotification('Ошибка при экспорте данных: ' + error.message, 'error');
        }
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.md';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            this.showConfirm(
                'Импорт данных',
                'Вы уверены, что хотите импортировать данные? Существующие данные будут перезаписаны.',
                () => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            this.processImportedData(data);
                            this.showNotification('Данные успешно импортированы!', 'success');
                        } catch (error) {
                            this.showNotification('Ошибка при импорте данных: ' + error.message, 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            );
        };
        
        input.click();
    }
    
    processImportedData(data) {
        if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
            this.saveSettings();
            this.populateSettings();
            this.applySettings();
        }
        
        if (data.notes) {
            this.saveNotesData(data.notes);
        }
    }
    
    createBackup() {
        try {
            const backupData = {
                notes: this.getNotesData(),
                settings: this.settings,
                backupDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const content = JSON.stringify(backupData, null, 2);
            const fileName = `notegrab-backup-${this.getFormattedDate()}.json`;
            
            this.downloadFile(content, fileName, 'application/json');
            this.addBackupToHistory(fileName);
            this.showNotification('Резервная копия создана!', 'success');
            
        } catch (error) {
            this.showNotification('Ошибка при создании бэкапа: ' + error.message, 'error');
        }
    }
    
    restoreBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            this.showConfirm(
                'Восстановление из бэкапа',
                'Вы уверены, что хотите восстановить данные из резервной копии? Текущие данные будут заменены.',
                () => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            this.processImportedData(data);
                            this.showNotification('Данные восстановлены из бэкапа!', 'success');
                        } catch (error) {
                            this.showNotification('Ошибка при восстановлении данных: ' + error.message, 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            );
        };
        
        input.click();
    }
    
    restoreFromBackup(backupName) {
        // В реальном приложении здесь будет логика восстановления из конкретного файла
        this.showNotification(`Восстановление из ${backupName} запущено`, 'info');
    }
    
    addBackupToHistory(fileName) {
        const backupList = document.querySelector('.backup-list');
        if (!backupList) return;
        
        const backupItem = document.createElement('div');
        backupItem.className = 'backup-item';
        backupItem.innerHTML = `
            <span>${fileName}</span>
            <span>${new Date().toLocaleString()}</span>
            <button class="btn-restore-backup">Восстановить</button>
        `;
        
        backupList.appendChild(backupItem);
        
        // Сохраняем историю в localStorage
        this.saveBackupHistory();
    }
    
    loadBackupHistory() {
        const history = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        const backupList = document.querySelector('.backup-list');
        
        if (!backupList) return;
        
        backupList.innerHTML = '';
        
        history.forEach(backup => {
            const backupItem = document.createElement('div');
            backupItem.className = 'backup-item';
            backupItem.innerHTML = `
                <span>${backup.name}</span>
                <span>${backup.date}</span>
                <button class="btn-restore-backup">Восстановить</button>
            `;
            
            backupList.appendChild(backupItem);
        });
    }
    
    saveBackupHistory() {
        const backupItems = document.querySelectorAll('.backup-item');
        const history = [];
        
        backupItems.forEach(item => {
            const name = item.children[0].textContent;
            const date = item.children[1].textContent;
            history.push({ name, date });
        });
        
        localStorage.setItem('backupHistory', JSON.stringify(history));
    }
    
    editShortcut(shortcutItem) {
        const description = shortcutItem.querySelector('.shortcut-description').textContent;
        const keysElement = shortcutItem.querySelector('.shortcut-keys');
        
        if (!keysElement) return;
        
        // Создаем временное поле ввода для редактирования
        const tempInput = document.createElement('input');
        tempInput.type = 'text';
        tempInput.value = keysElement.textContent.replace(/ \+ /g, '+');
        tempInput.style.cssText = `
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--card-bg);
            color: var(--text-primary);
            font-size: 14px;
            width: 150px;
        `;
        
        keysElement.innerHTML = '';
        keysElement.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        
        const saveShortcut = () => {
            const newShortcut = tempInput.value.trim();
            if (newShortcut) {
                // Обновляем настройки
                if (description.includes('Новая заметка')) {
                    this.settings.shortcuts.newNote = newShortcut;
                } else if (description.includes('Поиск')) {
                    this.settings.shortcuts.search = newShortcut;
                } else if (description.includes('Сохранить')) {
                    this.settings.shortcuts.save = newShortcut;
                } else if (description.includes('Экспорт')) {
                    this.settings.shortcuts.export = newShortcut;
                }
                
                this.saveSettings();
                this.populateShortcuts();
            }
        };
        
        tempInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveShortcut();
            } else if (e.key === 'Escape') {
                this.populateShortcuts();
            }
        });
        
        tempInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.contains(tempInput)) {
                    saveShortcut();
                }
            }, 100);
        });
    }
    
    resetShortcuts() {
        this.settings.shortcuts = {
            newNote: 'Ctrl+N',
            search: 'Ctrl+F',
            save: 'Ctrl+S',
            export: 'Ctrl+E'
        };
        this.saveSettings();
        this.populateShortcuts();
        this.showNotification('Сочетания клавиш сброшены', 'success');
    }
    
    clearData() {
        localStorage.removeItem('notes');
        localStorage.removeItem('appSettings');
        localStorage.removeItem('backupHistory');
        localStorage.removeItem('globalAppSettings');
        this.settings = this.loadSettings();
        this.populateSettings();
        this.applySettings();
        this.loadBackupHistory();
        this.showNotification('Все данные удалены', 'warning');
    }
    
    resetSettings() {
        localStorage.removeItem('appSettings');
        localStorage.removeItem('globalAppSettings');
        this.settings = this.loadSettings();
        this.populateSettings();
        this.applySettings();
        this.showNotification('Настройки сброшены', 'success');
    }
    
    showConfirm(title, message, callback) {
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmModal = document.getElementById('confirmModal');
        
        if (confirmTitle && confirmMessage && confirmModal) {
            confirmTitle.textContent = title;
            confirmMessage.textContent = message;
            confirmModal.classList.add('show');
            this.confirmCallback = callback;
        }
    }
    
    hideConfirm() {
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) {
            confirmModal.classList.remove('show');
        }
        this.confirmCallback = null;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    getFormattedDate() {
        return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    }
    
    convertToMarkdown(notes) {
        let markdown = '# NoteGrab Export\n\n';
        markdown += `*Дата экспорта: ${new Date().toLocaleString()}*\n\n`;
        
        if (notes && notes.length > 0) {
            notes.forEach(note => {
                markdown += `## ${note.title || 'Без названия'}\n\n`;
                markdown += `${note.content || ''}\n\n`;
                if (note.category) {
                    markdown += `**Категория:** ${note.category}  \n`;
                }
                if (note.createdAt) {
                    markdown += `**Создано:** ${new Date(note.createdAt).toLocaleString()}  \n`;
                }
                markdown += '\n---\n\n';
            });
        } else {
            markdown += 'Нет заметок для экспорта.\n';
        }
        
        return markdown;
    }
    
    getNotesData() {
        return JSON.parse(localStorage.getItem('notes') || '[]');
    }
    
    saveNotesData(notes) {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    populateSystemInfo() {
        // Версия Electron
        const electronVersion = document.getElementById('electron-version');
        if (electronVersion) {
            if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
                electronVersion.textContent = process.versions.electron;
            } else {
                electronVersion.textContent = 'N/A (браузер)';
            }
        }
        
        // Версия Node.js
        const nodeVersion = document.getElementById('node-version');
        if (nodeVersion) {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                nodeVersion.textContent = process.versions.node;
            } else {
                nodeVersion.textContent = 'N/A (браузер)';
            }
        }
        
        // Платформа
        const platform = document.getElementById('platform');
        if (platform) {
            if (typeof process !== 'undefined' && process.platform) {
                platform.textContent = process.platform;
            } else {
                platform.textContent = navigator.platform || 'N/A';
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Добавляем CSS анимации для уведомлений, если их еще нет
if (!document.querySelector('style[data-notifications]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notifications', 'true');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Функция для применения темы на других страницах
function applyThemeOnOtherPages() {
    const savedSettings = localStorage.getItem('globalAppSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        document.body.className = `theme-${settings.theme}`;
        if (settings.accentColor) {
            document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
    
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        window.settingsManager.showSection(hash);
    }
});

// Экспорт функции для использования на других страницах
if (typeof window !== 'undefined') {
    window.applyThemeOnOtherPages = applyThemeOnOtherPages;
    window.SettingsManager = SettingsManager;
}