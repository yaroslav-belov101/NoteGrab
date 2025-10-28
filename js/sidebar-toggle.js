// Управление компактным сайдбаром для всех страниц
class SidebarToggle {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.pinButtons = document.querySelectorAll('.pin-button');
        this.isPinned = this.loadSidebarState();
        
        this.init();
    }

    init() {
        // Применяем состояние при загрузке
        this.applySidebarState();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
        
        console.log('Sidebar initialized:', this.isPinned ? 'pinned' : 'unpinned');
    }

    loadSidebarState() {
        // Загружаем из localStorage, по умолчанию - развернут
        const saved = localStorage.getItem('sidebarPinned');
        return saved !== 'false'; // true если не установлено в false
    }

    saveSidebarState() {
        localStorage.setItem('sidebarPinned', this.isPinned.toString());
    }

    applySidebarState() {
        if (!this.sidebar || !this.mainContent) {
            console.warn('Sidebar or main content element not found');
            return;
        }

        if (this.isPinned) {
            this.pinSidebar();
        } else {
            this.unpinSidebar();
        }
    }

    setupEventListeners() {
        // Обработчики для всех кнопок PIN
        this.pinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSidebar();
            });
        });

        // Слушаем изменения localStorage от других вкладок
        window.addEventListener('storage', (e) => {
            if (e.key === 'sidebarPinned') {
                this.isPinned = e.newValue !== 'false';
                this.applySidebarState();
            }
        });

        // Адаптация для мобильных устройств
        this.setupMobileBehavior();
        window.addEventListener('resize', () => this.setupMobileBehavior());
    }

    setupMobileBehavior() {
        if (window.innerWidth <= 768 && this.isPinned) {
            // На мобильных автоматически сворачиваем сайдбар
            this.unpinSidebar();
        }
    }

    toggleSidebar() {
        this.isPinned = !this.isPinned;
        this.applySidebarState();
        this.saveSidebarState();
        
        // Синхронизируем с другими вкладками
        this.syncWithOtherTabs();
        
        console.log('Sidebar toggled:', this.isPinned ? 'pinned' : 'unpinned');
    }

    pinSidebar() {
        this.sidebar.classList.remove('sidebar-unpinned');
        this.sidebar.classList.add('sidebar-pinned');
        
        this.mainContent.classList.remove('main-content-unpinned');
        this.mainContent.classList.add('main-content-pinned');
        
        // Обновляем все кнопки PIN
        this.pinButtons.forEach(button => {
            button.classList.add('pinned');
        });
    }

    unpinSidebar() {
        this.sidebar.classList.remove('sidebar-pinned');
        this.sidebar.classList.add('sidebar-unpinned');
        
        this.mainContent.classList.remove('main-content-pinned');
        this.mainContent.classList.add('main-content-unpinned');
        
        // Обновляем все кнопки PIN
        this.pinButtons.forEach(button => {
            button.classList.remove('pinned');
        });
    }

    syncWithOtherTabs() {
        // Создаем событие для синхронизации в текущей вкладке
        const event = new StorageEvent('storage', {
            key: 'sidebarPinned',
            newValue: this.isPinned.toString(),
            oldValue: (!this.isPinned).toString(),
            url: window.location.href,
            storageArea: localStorage
        });
        window.dispatchEvent(event);
    }
}

// Автоматическая инициализация при загрузке DOM
function initializeSidebar() {
    // Ждем полной загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new SidebarToggle();
        });
    } else {
        new SidebarToggle();
    }
}

// Инициализируем сразу
initializeSidebar();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarToggle;
}