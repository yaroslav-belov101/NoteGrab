// Учебные материалы - основной функционал с сохранением в файл через IPC
const { ipcRenderer } = require('electron');

class StudyMaterials {
    constructor() {
        this.dataDir = 'data_study-mat';
        this.dataFile = `${this.dataDir}/study_mat.json`;
        this.materials = {};
        this.init();
    }

    async init() {
        await this.loadMaterials();
        this.renderCategories();
        this.setupEventListeners();
        this.setupSearch();
    }

    // Загрузка материалов из файла
    async loadMaterials() {
        try {
            console.log('📖 Загрузка учебных материалов...');
            
            const data = await ipcRenderer.invoke('read-file', this.dataFile);
            
            if (data && typeof data === 'string') {
                // Если файл существует и содержит данные
                const parsedData = JSON.parse(data);
                this.materials = parsedData;
                console.log('✅ Учебные материалы загружены из файла');
            } else {
                // Если файла нет, создаем начальные данные
                this.materials = {
                    'math': [
                        {
                            id: '1',
                            title: 'Khan Academy - Математика',
                            url: 'https://www.khanacademy.org/math',
                            description: 'Бесплатные курсы по математике разных уровней',
                            tags: ['курс', 'бесплатно', 'видео'],
                            category: 'math',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ],
                    'programming': [
                        {
                            id: '2',
                            title: 'MDN Web Docs',
                            url: 'https://developer.mozilla.org',
                            description: 'Документация по веб-технологиям',
                            tags: ['документация', 'веб', 'справочник'],
                            category: 'programming',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ],
                    'ai': [
                        {
                            id: '3',
                            title: 'Coursera - Machine Learning',
                            url: 'https://www.coursera.org/learn/machine-learning',
                            description: 'Курс по машинному обучению от Andrew Ng',
                            tags: ['курс', 'ml', 'нейросети'],
                            category: 'ai',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    ]
                };
                
                await this.saveMaterials();
                console.log('✅ Создан файл с начальными данными');
            }
            
            return this.materials;
        } catch (error) {
            console.error('❌ Ошибка загрузки учебных материалов:', error);
            
            // Если произошла ошибка, создаем пустую структуру
            this.materials = {
                'math': [],
                'programming': [],
                'ai': []
            };
            
            await this.saveMaterials();
            return this.materials;
        }
    }

    // Сохранение материалов в файл
    async saveMaterials() {
        try {
            console.log('💾 Сохранение учебных материалов...');
            
            const data = JSON.stringify(this.materials, null, 2);
            const result = await ipcRenderer.invoke('write-file', this.dataFile, data);
            
            if (result && typeof result === 'string') {
                const parsedResult = JSON.parse(result);
                if (parsedResult.success) {
                    console.log('✅ Учебные материалы сохранены в файл');
                } else {
                    throw new Error(parsedResult.error || 'Unknown error');
                }
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения учебных материалов:', error);
            throw error;
        }
    }

    // Рендер категорий
    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) {
            console.error('❌ Не найден элемент categoriesGrid');
            return;
        }

        grid.innerHTML = '';

        const categories = [
            {
                id: 'math',
                title: 'Математика',
                icon: '∫',
                color: '#3B82F6',
                description: 'Алгебра, геометрия, математический анализ'
            },
            {
                id: 'programming',
                title: 'Программирование',
                icon: '{}',
                color: '#10B981',
                description: 'Языки программирования, алгоритмы, веб-разработка'
            },
            {
                id: 'ai',
                title: 'Искусственный интеллект',
                icon: '🤖',
                color: '#8B5CF6',
                description: 'Машинное обучение, нейросети, Data Science'
            }
        ];

        categories.forEach(category => {
            const categoryElement = this.createCategoryElement(category);
            grid.appendChild(categoryElement);
        });
    }

    // Создание элемента категории
    createCategoryElement(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'study-category';
        categoryDiv.innerHTML = `
            <div class="category-header" style="border-left-color: ${category.color}">
                <div class="category-icon" style="background: ${category.color}">
                    ${category.icon}
                </div>
                <h3 class="category-title">${category.title}</h3>
                <span class="material-count">${this.materials[category.id]?.length || 0} материалов</span>
            </div>
            <p class="category-description">${category.description}</p>
            <div class="materials-list" id="materials-${category.id}">
                ${this.renderMaterialsList(category.id)}
            </div>
            <button class="add-to-category-btn" data-category="${category.id}">
                + Добавить в ${category.title}
            </button>
        `;

        // Обработчики для кнопок в материалах
        setTimeout(() => {
            this.attachMaterialEventListeners(category.id);
        }, 0);

        return categoryDiv;
    }

    // Рендер списка материалов для категории
    renderMaterialsList(categoryId) {
        const materials = this.materials[categoryId] || [];
        
        if (materials.length === 0) {
            return `
                <div class="empty-materials">
                    <div class="empty-icon">📚</div>
                    <p>Пока нет материалов</p>
                </div>
            `;
        }

        // Сортируем материалы по дате обновления (новые сверху)
        const sortedMaterials = materials.sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        return sortedMaterials.map(material => `
            <div class="material-item" data-id="${material.id}">
                <div class="material-main">
                    <div class="material-info">
                        <h4 class="material-title">${material.title}</h4>
                        <p class="material-description">${material.description}</p>
                        <div class="material-tags">
                            ${material.tags.map(tag => `<span class="material-tag">${tag}</span>`).join('')}
                        </div>
                        <div class="material-dates">
                            <small>Добавлено: ${this.formatDate(material.createdAt)}</small>
                            ${material.updatedAt !== material.createdAt ? 
                                `<small>Обновлено: ${this.formatDate(material.updatedAt)}</small>` : ''}
                        </div>
                    </div>
                    <div class="material-actions">
                        <button class="material-btn visit-btn" data-url="${material.url}" title="Перейти по ссылке">
                            🔗
                        </button>
                        <button class="material-btn edit-btn" data-id="${material.id}" title="Редактировать">
                            ✏️
                        </button>
                        <button class="material-btn delete-btn" data-id="${material.id}" title="Удалить">
                            🗑️
                        </button>
                    </div>
                </div>
                <a href="${material.url}" target="_blank" class="material-url">${material.url}</a>
            </div>
        `).join('');
    }

    // Форматирование даты
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Неизвестно';
        }
    }

    // Прикрепление обработчиков событий к материалам
    attachMaterialEventListeners(categoryId) {
        const materialsContainer = document.getElementById(`materials-${categoryId}`);
        if (!materialsContainer) return;
        
        // Кнопка перехода по ссылке
        materialsContainer.querySelectorAll('.visit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = btn.getAttribute('data-url');
                this.openLink(url);
            });
        });

        // Кнопка редактирования
        materialsContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const materialId = btn.getAttribute('data-id');
                this.editMaterial(materialId);
            });
        });

        // Кнопка удаления
        materialsContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const materialId = btn.getAttribute('data-id');
                this.deleteMaterial(materialId);
            });
        });
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка добавления материала
        const addBtn = document.getElementById('addMaterialBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddModal();
            });
        }

        // Кнопки добавления в конкретную категорию (делегирование)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-category-btn')) {
                const category = e.target.getAttribute('data-category');
                this.showAddModal(category);
            }
        });

        // Закрытие модального окна
        const closeBtn = document.getElementById('studyModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }

        const cancelBtn = document.getElementById('studyCancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }

        const backdrop = document.getElementById('studyModalBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target.id === 'studyModalBackdrop') {
                    this.hideModal();
                }
            });
        }

        // Форма отправки
        const form = document.getElementById('studyForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMaterial();
            });
        }
    }

    // Настройка поиска
    setupSearch() {
        const searchInput = document.getElementById('studySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterMaterials(e.target.value);
            });
        }
    }

    // Фильтрация материалов
    filterMaterials(searchTerm) {
        const categories = document.querySelectorAll('.study-category');
        
        categories.forEach(category => {
            const materials = category.querySelectorAll('.material-item');
            let hasVisibleMaterials = false;

            materials.forEach(material => {
                const title = material.querySelector('.material-title').textContent.toLowerCase();
                const description = material.querySelector('.material-description').textContent.toLowerCase();
                const tags = material.querySelector('.material-tags').textContent.toLowerCase();
                
                const matches = title.includes(searchTerm.toLowerCase()) ||
                              description.includes(searchTerm.toLowerCase()) ||
                              tags.includes(searchTerm.toLowerCase());

                material.style.display = matches ? 'flex' : 'none';
                if (matches) hasVisibleMaterials = true;
            });

            // Показываем/скрываем категорию в зависимости от наличия результатов
            const emptyState = category.querySelector('.empty-materials');
            const materialsList = category.querySelector('.materials-list');
            
            if (searchTerm && !hasVisibleMaterials && materials.length > 0) {
                materialsList.style.display = 'none';
                if (!emptyState) {
                    const noResults = document.createElement('div');
                    noResults.className = 'empty-materials';
                    noResults.innerHTML = `
                        <div class="empty-icon">🔍</div>
                        <p>Не найдено материалов по запросу</p>
                    `;
                    category.querySelector('.materials-list').appendChild(noResults);
                }
            } else {
                materialsList.style.display = 'block';
                if (emptyState && searchTerm) {
                    emptyState.remove();
                }
            }
        });
    }

    // Показать модальное окно
    showAddModal(preSelectedCategory = '') {
        const modal = document.getElementById('studyModalBackdrop');
        const form = document.getElementById('studyForm');
        
        if (!modal || !form) {
            console.error('❌ Не найдены элементы модального окна');
            return;
        }

        form.reset();
        this.currentEditingId = null;

        if (preSelectedCategory) {
            document.getElementById('materialCategory').value = preSelectedCategory;
        }

        modal.style.display = 'flex';
        
        // Фокус на поле ввода
        setTimeout(() => {
            const titleInput = document.getElementById('materialTitle');
            if (titleInput) titleInput.focus();
        }, 100);
        
        // Обновляем заголовок
        const header = document.querySelector('.study-modal-header h3');
        if (header) {
            header.textContent = 'Добавить учебный материал';
        }
    }

    // Скрыть модальное окно
    hideModal() {
        const modal = document.getElementById('studyModalBackdrop');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditingId = null;
    }

    // Редактировать материал
    editMaterial(materialId) {
        const material = this.findMaterialById(materialId);
        if (!material) {
            this.showNotification('Материал не найден', 'error');
            return;
        }

        const form = document.getElementById('studyForm');
        if (!form) return;

        document.getElementById('materialTitle').value = material.title;
        document.getElementById('materialUrl').value = material.url;
        document.getElementById('materialCategory').value = material.category;
        document.getElementById('materialDescription').value = material.description || '';
        document.getElementById('materialTags').value = material.tags ? material.tags.join(', ') : '';

        this.currentEditingId = materialId;
        document.getElementById('studyModalBackdrop').style.display = 'flex';
        
        const header = document.querySelector('.study-modal-header h3');
        if (header) {
            header.textContent = 'Редактировать материал';
        }
    }

    // Найти материал по ID
    findMaterialById(materialId) {
        for (const category in this.materials) {
            const material = this.materials[category].find(m => m.id === materialId);
            if (material) return material;
        }
        return null;
    }

    // Сохранить материал
    async saveMaterial() {
        const formData = {
            title: document.getElementById('materialTitle').value.trim(),
            url: document.getElementById('materialUrl').value.trim(),
            category: document.getElementById('materialCategory').value,
            description: document.getElementById('materialDescription').value.trim(),
            tags: document.getElementById('materialTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        // Валидация
        if (!formData.title || !formData.url || !formData.category) {
            this.showNotification('Заполните обязательные поля', 'error');
            return;
        }

        // Валидация URL
        try {
            new URL(formData.url);
        } catch (error) {
            this.showNotification('Введите корректный URL', 'error');
            return;
        }

        try {
            if (this.currentEditingId) {
                // Редактирование существующего материала
                await this.updateMaterial(this.currentEditingId, formData);
                this.showNotification('Материал обновлен успешно!');
            } else {
                // Добавление нового материала
                await this.addMaterial(formData);
                this.showNotification('Материал добавлен успешно!');
            }

            this.hideModal();
            this.renderCategories();
            await this.saveMaterials();
            
        } catch (error) {
            console.error('❌ Ошибка сохранения материала:', error);
            this.showNotification('Ошибка сохранения материала', 'error');
        }
    }

    // Добавить материал
    async addMaterial(materialData) {
        const newMaterial = {
            id: Date.now().toString(),
            ...materialData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!this.materials[materialData.category]) {
            this.materials[materialData.category] = [];
        }

        this.materials[materialData.category].push(newMaterial);
    }

    // Обновить материал
    async updateMaterial(materialId, newData) {
        const oldMaterial = this.findMaterialById(materialId);
        if (!oldMaterial) {
            throw new Error('Материал не найден');
        }

        // Если категория изменилась, перемещаем материал
        if (oldMaterial.category !== newData.category) {
            // Удаляем из старой категории
            this.materials[oldMaterial.category] = this.materials[oldMaterial.category].filter(m => m.id !== materialId);
            
            // Добавляем в новую категорию
            if (!this.materials[newData.category]) {
                this.materials[newData.category] = [];
            }
            this.materials[newData.category].push({
                ...oldMaterial,
                ...newData,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Обновляем в той же категории
            const materialIndex = this.materials[oldMaterial.category].findIndex(m => m.id === materialId);
            if (materialIndex !== -1) {
                this.materials[oldMaterial.category][materialIndex] = {
                    ...this.materials[oldMaterial.category][materialIndex],
                    ...newData,
                    updatedAt: new Date().toISOString()
                };
            }
        }
    }

    // Удалить материал
    async deleteMaterial(materialId, showNotification = true) {
        if (!confirm('Вы уверены, что хотите удалить этот материал?')) {
            return;
        }

        try {
            let deleted = false;
            for (const category in this.materials) {
                const initialLength = this.materials[category].length;
                this.materials[category] = this.materials[category].filter(m => m.id !== materialId);
                if (this.materials[category].length < initialLength) {
                    deleted = true;
                }
            }

            if (deleted) {
                if (showNotification) {
                    this.showNotification('Материал удален');
                }
                this.renderCategories();
                await this.saveMaterials();
            } else {
                this.showNotification('Материал не найден', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка удаления материала:', error);
            this.showNotification('Ошибка удаления материала', 'error');
        }
    }

    // Открыть ссылку
    openLink(url) {
        try {
            // Для Electron используем shell.openExternal
            if (window.require) {
                const { shell } = window.require('electron');
                shell.openExternal(url);
            } else {
                // Для браузера
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('❌ Ошибка открытия ссылки:', error);
            this.showNotification('Ошибка открытия ссылки', 'error');
        }
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

// Добавляем стили для анимаций уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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
document.head.appendChild(notificationStyles);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация учебных материалов...');
    new StudyMaterials();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudyMaterials;
}