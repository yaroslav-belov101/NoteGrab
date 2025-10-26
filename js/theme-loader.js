// theme-loader.js
document.addEventListener('DOMContentLoaded', function() {
    // Функция применения темы и настроек
    function applyThemeAndSettings() {
        const savedSettings = localStorage.getItem('globalAppSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                
                // Применяем тему к body
                document.body.className = `theme-${settings.theme}`;
                
                // Применяем акцентный цвет
                if (settings.accentColor) {
                    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
                }
                
                // Применяем настройку компактного сайдбара
                applyCompactSidebar(settings.compactSidebar);
                
                console.log('Настройки применены:', settings.theme, 'Compact sidebar:', settings.compactSidebar);
            } catch (e) {
                console.error('Ошибка применения настроек:', e);
                applyDefaultSettings();
            }
        } else {
            applyDefaultSettings();
        }
    }
    
    // Функция применения компактного сайдбара
    function applyCompactSidebar(compactSidebar) {
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
    
    // Функция применения настроек по умолчанию
    function applyDefaultSettings() {
        document.body.className = 'theme-dark';
        applyCompactSidebar(false);
    }
    
    // Инициализация управления сайдбаром
    function initSidebar() {
        const pinButton = document.getElementById('pinToggle');
        if (pinButton) {
            pinButton.addEventListener('click', function() {
                const sidebar = document.querySelector('.sidebar');
                const mainContent = document.querySelector('.main-content');
                
                if (sidebar.classList.contains('sidebar-pinned')) {
                    // Переключаем в компактный режим
                    sidebar.classList.remove('sidebar-pinned');
                    sidebar.classList.add('sidebar-unpinned');
                    mainContent.classList.remove('main-content-pinned');
                    mainContent.classList.add('main-content-unpinned');
                    pinButton.classList.remove('pinned');
                    
                    // Сохраняем настройку
                    updateCompactSidebarSetting(true);
                } else {
                    // Переключаем в обычный режим
                    sidebar.classList.remove('sidebar-unpinned');
                    sidebar.classList.add('sidebar-pinned');
                    mainContent.classList.remove('main-content-unpinned');
                    mainContent.classList.add('main-content-pinned');
                    pinButton.classList.add('pinned');
                    
                    // Сохраняем настройку
                    updateCompactSidebarSetting(false);
                }
            });
        }
    }
    
    // Функция обновления настройки компактного сайдбара
    function updateCompactSidebarSetting(compactSidebar) {
        const savedSettings = localStorage.getItem('globalAppSettings');
        let settings = savedSettings ? JSON.parse(savedSettings) : {};
        
        settings.compactSidebar = compactSidebar;
        localStorage.setItem('globalAppSettings', JSON.stringify(settings));
    }
    
    // Применяем настройки при загрузке
    applyThemeAndSettings();
    initSidebar();
    
    // Слушаем изменения в localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'globalAppSettings') {
            applyThemeAndSettings();
        }
    });
});