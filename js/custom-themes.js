// Система пользовательских тем
class CustomThemeManager {
    constructor() {
        this.customThemes = this.loadCustomThemes();
        this.init();
    }

    init() {
        this.renderCustomThemes();
        this.setupEventListeners();
        this.setupColorSync();
        this.setupInfiniteScroll();
    }

    // Загрузка пользовательских тем
    loadCustomThemes() {
        try {
            const saved = localStorage.getItem('customThemes');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Ошибка загрузки пользовательских тем:', error);
        }
        return {};
    }

    // Сохранение пользовательских тем
    saveCustomThemes() {
        try {
            localStorage.setItem('customThemes', JSON.stringify(this.customThemes));
        } catch (error) {
            console.error('Ошибка сохранения пользовательских тем:', error);
        }
    }

    // Рендер списка пользовательских тем
    renderCustomThemes() {
        const grid = document.getElementById('customThemesGrid');
        if (!grid) return;

        const themes = Object.values(this.customThemes);
        
        if (themes.length === 0) {
            grid.innerHTML = `
                <div class="no-custom-themes">
                    <div class="empty-icon">🎨</div>
                    <p>У вас пока нет пользовательских тем</p>
                </div>
            `;
            return;
        }

        // Сортируем темы по дате создания (новые снизу)
        const sortedThemes = themes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        grid.innerHTML = sortedThemes.map(theme => this.createThemePreview(theme)).join('');

        this.attachThemeEventListeners();
        this.highlightActiveTheme();
    }

    // Создание превью темы
    createThemePreview(theme) {
        return `
            <div class="custom-theme-item" data-theme-id="${theme.id}">
                <button class="btn-delete-theme" data-theme-id="${theme.id}" title="Удалить тему">×</button>
                <div class="theme-preview-small" style="
                    --primary-bg: ${theme.variables['--primary-bg']};
                    --secondary-bg: ${theme.variables['--secondary-bg']};
                    --sidebar-bg: ${theme.variables['--sidebar-bg']};
                    --card-bg: ${theme.variables['--card-bg']};
                    --border-color: ${theme.variables['--border-color']};
                    --text-primary: ${theme.variables['--text-primary']};
                    --accent-color: ${theme.variables['--accent-color']};
                ">
                    <div class="preview-detail preview-detail-1"></div>
                    <div class="preview-detail preview-detail-2"></div>
                    <div class="preview-detail preview-detail-3"></div>
                    <div class="preview-card"></div>
                    <div class="preview-accent"></div>
                </div>
                <div class="custom-theme-name">${theme.name}</div>
                <div class="custom-theme-date">${new Date(theme.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
        `;
    }

    // Прикрепление обработчиков событий к темам
    attachThemeEventListeners() {
        const grid = document.getElementById('customThemesGrid');
        if (!grid) return;

        // Обработчики для применения темы
        grid.querySelectorAll('.custom-theme-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-delete-theme')) {
                    const themeId = item.getAttribute('data-theme-id');
                    this.applyCustomTheme(themeId);
                }
            });
        });

        // Обработчики для кнопок удаления
        grid.querySelectorAll('.btn-delete-theme').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeId = btn.getAttribute('data-theme-id');
                this.deleteCustomTheme(themeId);
            });
        });
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Сохранение темы
        const saveBtn = document.getElementById('saveCustomTheme');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveNewTheme();
            });
        }

        // Сброс цветов
        const resetBtn = document.getElementById('resetThemeColors');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetThemeColors();
            });
        }

        // Сохранение по Enter в поле названия
        const nameInput = document.getElementById('themeNameInput');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveNewTheme();
                }
            });
        }
    }

    // Настройка бесконечного скролла
    setupInfiniteScroll() {
        const container = document.querySelector('.custom-themes-list');
        if (!container) return;

        // Убираем ограничение высоты для контейнера
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';

        // Убираем ограничение высоты для сетки тем
        const grid = document.getElementById('customThemesGrid');
        if (grid) {
            grid.style.maxHeight = 'none';
            grid.style.overflowY = 'visible';
        }
    }

    // Синхронизация цветов предпросмотра
    setupColorSync() {
        const colorPickers = document.querySelectorAll('.theme-color-picker');
        colorPickers.forEach(picker => {
            picker.addEventListener('input', () => {
                this.updateThemePreview();
            });
        });
    }

    // Обновление предпросмотра темы в реальном времени
    updateThemePreview() {
        // Можно добавить live-предпросмотр если нужно
    }

    // Сброс цветов к значениям по умолчанию (темная тема)
    resetThemeColors() {
        document.getElementById('themePrimaryBg').value = '#000000';
        document.getElementById('themeSecondaryBg').value = '#0a0a0a';
        document.getElementById('themeCardBg').value = '#111111';
        document.getElementById('themeAccentColor').value = '#6366f1';
        document.getElementById('themeTextPrimary').value = '#ffffff';
        document.getElementById('themeTextSecondary').value = '#cccccc';
    }

    // Сохранение новой темы
    saveNewTheme() {
        const nameInput = document.getElementById('themeNameInput');
        const themeName = nameInput.value.trim();

        if (!themeName) {
            this.showNotification('Введите название темы', 'error');
            nameInput.focus();
            return;
        }

        // Проверяем, нет ли темы с таким же именем
        if (Object.values(this.customThemes).some(theme => theme.name.toLowerCase() === themeName.toLowerCase())) {
            this.showNotification('Тема с таким названием уже существует', 'error');
            return;
        }

        const primaryBg = document.getElementById('themePrimaryBg').value;
        const secondaryBg = document.getElementById('themeSecondaryBg').value;
        const cardBg = document.getElementById('themeCardBg').value;
        const accentColor = document.getElementById('themeAccentColor').value;
        const textPrimary = document.getElementById('themeTextPrimary').value;
        const textSecondary = document.getElementById('themeTextSecondary').value;

        const themeId = 'custom-' + Date.now();
        const newTheme = {
            id: themeId,
            name: themeName,
            createdAt: new Date().toISOString(),
            variables: {
                '--primary-bg': primaryBg,
                '--secondary-bg': secondaryBg,
                '--card-bg': cardBg,
                '--sidebar-bg': `linear-gradient(180deg, ${primaryBg} 0%, ${secondaryBg} 100%)`,
                '--header-bg': secondaryBg,
                '--border-color': this.adjustColor(cardBg, 30),
                '--text-primary': textPrimary,
                '--text-secondary': textSecondary,
                '--text-muted': this.adjustColor(textSecondary, -40),
                '--accent-color': accentColor,
                '--hover-bg': this.hexToRgba(accentColor, 0.15),
                '--shadow-color': 'rgba(0, 0, 0, 0.5)'
            }
        };

        // Сохраняем тему
        this.customThemes[themeId] = newTheme;
        this.saveCustomThemes();
        
        // Обновляем отображение
        this.renderCustomThemes();
        
        // Очищаем поле ввода
        nameInput.value = '';
        
        // Показываем уведомление
        this.showNotification(`Тема "${themeName}" создана!`);
        
        // Прокручиваем к новой теме
        this.scrollToNewTheme(themeId);
        
        // Применяем новую тему автоматически
        this.applyCustomTheme(themeId);
    }

    // Прокрутка к новой теме
    scrollToNewTheme(themeId) {
        setTimeout(() => {
            const newThemeElement = document.querySelector(`[data-theme-id="${themeId}"]`);
            if (newThemeElement) {
                newThemeElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
                
                // Добавляем анимацию появления
                newThemeElement.style.animation = 'pulseGlow 2s ease-in-out';
            }
        }, 100);
    }

    // Применение пользовательской темы
    applyCustomTheme(themeId) {
        const theme = this.customThemes[themeId];
        if (!theme) {
            this.showNotification('Тема не найдена', 'error');
            return;
        }

        // Удаляем предыдущую пользовательскую тему
        const existingCustomTheme = document.getElementById('custom-theme-style');
        if (existingCustomTheme) {
            existingCustomTheme.remove();
        }

        // Создаем стили для новой темы
        const style = document.createElement('style');
        style.id = 'custom-theme-style';
        
        let css = `.theme-custom {\n`;
        for (const [variable, value] of Object.entries(theme.variables)) {
            css += `  ${variable}: ${value};\n`;
        }
        css += `}`;
        
        style.textContent = css;
        document.head.appendChild(style);

        // Применяем тему
        document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
        document.body.classList.add('theme-custom');

        // Сохраняем выбор в localStorage
        localStorage.setItem('selectedTheme', 'theme-custom');
        localStorage.setItem('customThemeId', themeId);

        this.showNotification(`Тема "${theme.name}" применена`);
        this.highlightActiveTheme();
    }

    // Подсветка активной темы
    highlightActiveTheme() {
        const currentThemeId = localStorage.getItem('customThemeId');
        
        document.querySelectorAll('.custom-theme-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (currentThemeId) {
            const activeItem = document.querySelector(`[data-theme-id="${currentThemeId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    // Удаление пользовательской темы
    deleteCustomTheme(themeId) {
        const theme = this.customThemes[themeId];
        if (!theme) return;

        if (!confirm(`Удалить тему "${theme.name}"?`)) {
            return;
        }

        delete this.customThemes[themeId];
        this.saveCustomThemes();
        this.renderCustomThemes();

        // Если удаленная тема была активна, переключаем на стандартную
        const currentCustomThemeId = localStorage.getItem('customThemeId');
        if (currentCustomThemeId === themeId) {
            localStorage.removeItem('customThemeId');
            localStorage.setItem('selectedTheme', 'theme-dark');
            
            // Перезагружаем страницу для применения стандартной темы
            this.showNotification('Тема удалена. Возврат к стандартной теме...');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            this.showNotification(`Тема "${theme.name}" удалена`);
        }
    }

    // Вспомогательные функции для работы с цветами
    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Показать уведомление
    showNotification(message, type = 'success') {
        // Создаем или находим контейнер для уведомлений
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10002;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Добавляем стили для анимаций
const themeStyles = document.createElement('style');
themeStyles.textContent = `
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
    
    @keyframes pulseGlow {
        0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
        }
        50% {
            box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
        }
    }
    
    /* Убираем ограничения скролла */
    .custom-themes-list {
        max-height: none !important;
        overflow-y: visible !important;
    }
    
    #customThemesGrid {
        max-height: none !important;
        overflow-y: visible !important;
    }
`;
document.head.appendChild(themeStyles);

// Инициализация при загрузке страницы настроек
if (document.getElementById('customThemesGrid')) {
    document.addEventListener('DOMContentLoaded', () => {
        new CustomThemeManager();
    });
}

// Загрузка пользовательской темы при старте приложения
function loadCustomThemeOnStart() {
    const customThemeId = localStorage.getItem('customThemeId');
    const selectedTheme = localStorage.getItem('selectedTheme');
    
    if (customThemeId && selectedTheme === 'theme-custom') {
        const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        const theme = customThemes[customThemeId];
        
        if (theme) {
            const style = document.createElement('style');
            style.id = 'custom-theme-style';
            
            let css = `.theme-custom {\n`;
            for (const [variable, value] of Object.entries(theme.variables)) {
                css += `  ${variable}: ${value};\n`;
            }
            css += `}`;
            
            style.textContent = css;
            document.head.appendChild(style);
            
            document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
            document.body.classList.add('theme-custom');
        }
    }
}

// Загружаем тему при запуске
document.addEventListener('DOMContentLoaded', loadCustomThemeOnStart);