// js/theme-sync.js
class ThemeSync {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupCrossTabSync();
    }

    loadTheme() {
        // Пробуем загрузить из разных источников
        const globalSettings = localStorage.getItem('globalAppSettings');
        if (globalSettings) {
            const settings = JSON.parse(globalSettings);
            return settings.theme || 'dark';
        }

        const appSettings = localStorage.getItem('appSettings');
        if (appSettings) {
            const settings = JSON.parse(appSettings);
            return settings.theme || 'dark';
        }

        return 'dark'; // тема по умолчанию
    }

    applyTheme(themeName) {
        console.log('Applying theme:', themeName);
        
        // Удаляем все классы тем
        document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
        
        // Добавляем текущую тему
        document.body.classList.add(`theme-${themeName}`);
        
        // Сохраняем в глобальной переменной
        window.currentTheme = themeName;
        
        // Обновляем UI если есть элементы выбора темы
        this.updateThemeSelection(themeName);
        
        // Сохраняем в localStorage для других вкладок
        this.saveThemeToStorage(themeName);
    }

    saveThemeToStorage(themeName) {
        // Сохраняем в globalAppSettings для других страниц
        const globalSettings = JSON.parse(localStorage.getItem('globalAppSettings') || '{}');
        globalSettings.theme = themeName;
        localStorage.setItem('globalAppSettings', JSON.stringify(globalSettings));

        // Также сохраняем в appSettings для страницы настроек
        const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        appSettings.theme = themeName;
        localStorage.setItem('appSettings', JSON.stringify(appSettings));

        // Триггер для синхронизации между вкладками
        localStorage.setItem('themeUpdate', Date.now().toString());
    }

    updateThemeSelection(themeName) {
        // Обновляем выбор темы в настройках если они есть на странице
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === themeName) {
                option.classList.add('active');
            }
        });
    }

    setupEventListeners() {
        // Обработчик для выбора темы
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const themeName = themeOption.dataset.theme;
                this.setTheme(themeName);
            }
        });

        // Слушаем изменения в localStorage от других вкладок
        window.addEventListener('storage', (e) => {
            if (e.key === 'themeUpdate' || e.key === 'globalAppSettings') {
                this.handleStorageChange(e);
            }
        });

        // Слушаем кастомные события от SettingsManager
        window.addEventListener('settingsChanged', (e) => {
            if (e.detail && e.detail.theme) {
                this.applyTheme(e.detail.theme);
            }
        });
    }

    setupCrossTabSync() {
        // Периодически проверяем актуальность темы
        setInterval(() => {
            const savedTheme = this.loadTheme();
            if (savedTheme !== this.currentTheme) {
                this.applyTheme(savedTheme);
            }
        }, 1000);
    }

    handleStorageChange(e) {
        if (e.key === 'themeUpdate') {
            // Просто обновляем тему из хранилища
            const newTheme = this.loadTheme();
            if (newTheme !== this.currentTheme) {
                this.applyTheme(newTheme);
            }
        } else if (e.key === 'globalAppSettings') {
            const newSettings = JSON.parse(e.newValue || '{}');
            if (newSettings.theme && newSettings.theme !== this.currentTheme) {
                this.applyTheme(newSettings.theme);
            }
        }
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        
        // Отправляем кастомное событие для других компонентов
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName }
        }));
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.themeSync = new ThemeSync();
});

// Функция для быстрого переключения темы из консоли
function switchTheme(themeName) {
    if (window.themeSync) {
        window.themeSync.setTheme(themeName);
    }
}