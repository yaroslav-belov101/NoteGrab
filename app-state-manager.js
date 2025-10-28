class AppStateManager {
  constructor() {
    this.state = {
      theme: 'theme-dark',
      sidebarPinned: true
    };
    this.init();
  }

  async init() {
    await this.loadState();
    this.setupEventListeners();
  }

  async loadState() {
    try {
      if (window.electronAPI) {
        const stateData = await window.electronAPI.loadAppState();
        const savedState = JSON.parse(stateData);
        this.state = { ...this.state, ...savedState };
        this.applyState();
      }
    } catch (error) {
      console.log('Используем состояние по умолчанию');
    }
  }

  async saveState(newState = {}) {
    this.state = { ...this.state, ...newState };
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveAppState(this.state);
      } else {
        // Fallback для браузера
        localStorage.setItem('appState', JSON.stringify(this.state));
      }
    } catch (error) {
      console.error('Ошибка сохранения состояния:', error);
    }
  }

  applyState() {
    // Применяем тему
    document.body.className = document.body.className.replace(/\btheme-\w+/g, '');
    document.body.classList.add(this.state.theme);
    
    // Применяем состояние сайдбара
    this.applySidebarState();
    
    // Обновляем индикаторы в UI
    this.updateUI();
  }

  applySidebarState() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
      if (this.state.sidebarPinned) {
        sidebar.classList.remove('sidebar-unpinned');
        sidebar.classList.add('sidebar-pinned');
        mainContent.classList.remove('main-content-unpinned');
        mainContent.classList.add('main-content-pinned');
      } else {
        sidebar.classList.remove('sidebar-pinned');
        sidebar.classList.add('sidebar-unpinned');
        mainContent.classList.remove('main-content-pinned');
        mainContent.classList.add('main-content-unpinned');
      }
    }
  }

  updateUI() {
    // Обновляем переключатель темы
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      const themeName = option.getAttribute('data-theme');
      if (themeName === this.state.theme) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });

    // Обновляем кнопку pin
    const pinButton = document.querySelector('.pin-button');
    if (pinButton) {
      if (this.state.sidebarPinned) {
        pinButton.classList.add('pinned');
        pinButton.innerHTML = '📌';
      } else {
        pinButton.classList.remove('pinned');
        pinButton.innerHTML = '📍';
      }
    }
  }

  setupEventListeners() {
    // Слушаем сообщения от главного процесса
    if (window.electronAPI) {
      window.electronAPI.onAppStateUpdated((event, newState) => {
        this.state = { ...this.state, ...newState };
        this.applyState();
      });
    }

    // Обработчики для переключения темы
    document.addEventListener('click', (e) => {
      const themeOption = e.target.closest('.theme-option');
      if (themeOption) {
        const themeName = themeOption.getAttribute('data-theme');
        this.setTheme(themeName);
      }

      // Обработчик для кнопки pin
      const pinButton = e.target.closest('.pin-button');
      if (pinButton) {
        this.toggleSidebar();
      }
    });
  }

  async setTheme(themeName) {
    this.state.theme = themeName;
    this.applyState();
    await this.saveState();
  }

  async toggleSidebar() {
    this.state.sidebarPinned = !this.state.sidebarPinned;
    this.applyState();
    await this.saveState();
  }

  getState() {
    return { ...this.state };
  }
}

// Инициализация при загрузке страницы
let appStateManager;

document.addEventListener('DOMContentLoaded', () => {
  appStateManager = new AppStateManager();
});

// Экспорт для использования в других модулях
window.AppStateManager = AppStateManager;