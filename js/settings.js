// settings.js
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.currentSection = 'appearance';
        this.initEventListeners();
        this.applySettings();
        this.populateSettings();
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
            backupPath: '/home/user/NoteGrab/backups'
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
        // Применение темы
        document.body.className = `theme-${this.settings.theme}`;
        
        // Применение акцентного цвета
        document.documentElement.style.setProperty('--accent-color', this.settings.accentColor);
        
        // Применение компактного сайдбара
        if (this.settings.compactSidebar) {
            const pinManager = window.pinManager;
            if (pinManager && !pinManager.isPinned) {
                pinManager.unpin();
            }
        }
        
        // Применение размера интерфейса
        this.applyUISize();
    }
    
    applyUISize() {
        const sizes = {
            compact: '0.9',
            normal: '1',
            large: '1.1'
        };
        document.documentElement.style.setProperty('--ui-scale', sizes[this.settings.uiSize] || '1');
    }
    
    populateSettings() {
        // Заполняем значения из настроек
        document.getElementById('theme').value = this.settings.theme;
        document.getElementById('uiSize').value = this.settings.uiSize;
        document.getElementById('compactSidebar').checked = this.settings.compactSidebar;
        document.getElementById('accentColor').value = this.settings.accentColor;
        document.getElementById('dataPath').value = this.settings.dataPath;
        document.getElementById('autoSave').value = this.settings.autoSave;
        document.getElementById('enableNotifications').checked = this.settings.enableNotifications;
        document.getElementById('taskReminders').checked = this.settings.taskReminders;
        document.getElementById('backupReminders').checked = this.settings.backupReminders;
        document.getElementById('soundEnabled').checked = this.settings.soundEnabled;
        document.getElementById('reminderTime').value = this.settings.reminderTime;
        document.getElementById('autoBackup').checked = this.settings.autoBackup;
        document.getElementById('backupFrequency').value = this.settings.backupFrequency;
        document.getElementById('backupPath').value = this.settings.backupPath;
        
        // Активируем текущую тему
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === this.settings.theme) {
                option.classList.add('active');
            }
        });
    }
    
    initEventListeners() {
        // Навигация по разделам
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
        
        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.settings.theme = option.dataset.theme;
                this.saveSettings();
                this.populateSettings();
            });
        });
        
        // Сохранение настроек при изменении
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.saveSetting(element));
        });
        
        // Кнопки экспорта
        document.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', () => {
                this.exportData(btn.dataset.format);
            });
        });
        
        // Кнопка импорта
        document.querySelector('.btn-import').addEventListener('click', () => {
            this.importData();
        });
        
        // Кнопка создания бэкапа
        document.querySelector('.btn-backup-now').addEventListener('click', () => {
            this.createBackup();
        });
        
        // Опасные действия
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearData();
        });
        
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Сброс горячих клавиш
        document.querySelector('.btn-reset-shortcuts').addEventListener('click', () => {
            this.resetShortcuts();
        });
        
        // Заполняем системную информацию
        this.populateSystemInfo();
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
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.processImportedData(data);
                    this.showNotification('Данные успешно импортированы!', 'success');
                } catch (error) {
                    this.showNotification('Ошибка при импорте данных', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    processImportedData(data) {
        if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
            this.saveSettings();
            this.populateSettings();
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
            this.showNotification('Ошибка при создании бэкапа', 'error');
        }
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
    }
    
    clearData() {
        if (confirm('Вы уверены, что хотите удалить все данные? Это действие нельзя отменить.')) {
            localStorage.removeItem('notes');
            localStorage.removeItem('appSettings');
            this.settings = this.loadSettings();
            this.populateSettings();
            this.showNotification('Все данные удалены', 'warning');
        }
    }
    
    resetSettings() {
        if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
            localStorage.removeItem('appSettings');
            this.settings = this.loadSettings();
            this.populateSettings();
            this.applySettings();
            this.showNotification('Настройки сброшены', 'success');
        }
    }
    
    resetShortcuts() {
        if (confirm('Сбросить все сочетания клавиш к значениям по умолчанию?')) {
            // Логика сброса горячих клавиш
            this.showNotification('Сочетания клавиш сброшены', 'success');
        }
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
        notes.forEach(note => {
            markdown += `## ${note.title}\n\n`;
            markdown += `${note.content}\n\n`;
            markdown += `*Категория: ${note.category}*  \n`;
            markdown += `*Создано: ${new Date(note.createdAt).toLocaleString()}*  \n\n`;
            markdown += '---\n\n';
        });
        return markdown;
    }
    
    getNotesData() {
        return JSON.parse(localStorage.getItem('notes') || '[]');
    }
    
    saveNotesData(notes) {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
    
    populateSystemInfo() {
        if (typeof process !== 'undefined') {
            document.getElementById('electron-version').textContent = process.versions.electron || 'N/A';
            document.getElementById('node-version').textContent = process.versions.node || 'N/A';
            document.getElementById('platform').textContent = process.platform || 'N/A';
        } else {
            document.getElementById('electron-version').textContent = 'N/A';
            document.getElementById('node-version').textContent = 'N/A';
            document.getElementById('platform').textContent = navigator.platform;
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
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
    
    // Показываем раздел из URL hash если есть
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        window.settingsManager.showSection(hash);
    }
});