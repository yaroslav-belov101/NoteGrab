// Загрузчик тем для приложения NoteGrab
class ThemeLoader {
    constructor() {
        this.availableThemes = ['theme-dark', 'theme-light', 'theme-blue'];
        this.init();
    }

    init() {
        this.loadSavedTheme();
        this.setupThemeSwitcher();
        this.setupThemePreviews();
    }

    // Загрузка сохраненной темы
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('selectedTheme');
        
        if (savedTheme && this.availableThemes.includes(savedTheme)) {
            this.applyTheme(savedTheme);
        } else {
            // По умолчанию используем темную тему
            this.applyTheme('theme-dark');
            localStorage.setItem('selectedTheme', 'theme-dark');
        }
    }

    // Применение темы
    applyTheme(themeName) {
        // Удаляем все классы тем
        document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
        
        // Добавляем новую тему
        document.body.classList.add(themeName);
        
        // Сохраняем выбор
        localStorage.setItem('selectedTheme', themeName);
        
        // Обновляем активный элемент в настройках
        this.updateActiveThemeIndicator(themeName);
        
        console.log(`Тема применена: ${themeName}`);
    }

    // Настройка переключателя тем
    setupThemeSwitcher() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const themeName = option.getAttribute('data-theme');
                if (themeName && this.availableThemes.includes(themeName)) {
                    this.applyTheme(themeName);
                }
            });
        });
    }

    // Обновление индикатора активной темы
    updateActiveThemeIndicator(activeTheme) {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            const themeName = option.getAttribute('data-theme');
            if (themeName === activeTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    // Настройка превью тем (если используется в настройках)
    setupThemePreviews() {
        // Эта функция может использоваться для динамического обновления превью тем
        // если они генерируются через JavaScript
    }

    // Получение текущей темы
    getCurrentTheme() {
        return localStorage.getItem('selectedTheme') || 'theme-dark';
    }

    // Проверка поддержки темной темы системы
    setupSystemThemeDetection() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // Система использует темную тему
            if (!localStorage.getItem('selectedTheme')) {
                this.applyTheme('theme-dark');
            }
        }

        // Слушаем изменения системной темы
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('selectedTheme')) {
                // Если пользователь не выбирал тему вручную, следуем системной
                this.applyTheme(e.matches ? 'theme-dark' : 'theme-light');
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const themeLoader = new ThemeLoader();
    
    // Экспортируем для использования в других модулях
    window.themeLoader = themeLoader;
});

// Функция для быстрого переключения темы (можно вызывать из консоли)
function switchTheme(themeName) {
    const themeLoader = window.themeLoader || new ThemeLoader();
    themeLoader.applyTheme(themeName);
}

// Автоматическое определение системной темы при первом запуске
function initializeSystemTheme() {
    const savedTheme = localStorage.getItem('selectedTheme');
    
    // Если тема еще не выбрана, определяем системную
    if (!savedTheme && window.matchMedia) {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeLoader = new ThemeLoader();
        themeLoader.applyTheme(isDarkMode ? 'theme-dark' : 'theme-light');
    }
}

// Инициализация при полной загрузке страницы
window.addEventListener('load', initializeSystemTheme);

// Экспорт для использования в Electron или других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeLoader, switchTheme, initializeSystemTheme };
}