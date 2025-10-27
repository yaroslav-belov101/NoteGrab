const { ipcRenderer } = require('electron');
const path = require('path');

document.addEventListener('DOMContentLoaded', () => {
    const booksContainer = document.getElementById('books-container');
    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');
    const sortSelect = document.getElementById('sort-by');
    const addBookBtn = document.getElementById('add-book-btn');
    const addBookModal = document.getElementById('add-book-modal');
    const bookForm = document.getElementById('book-form');
    const coverImageInput = document.getElementById('cover-image');
    const coverPreview = document.getElementById('cover-preview');
    const dropZone = document.getElementById('drop-zone');

    let books = [];

    function init() {
        console.log('🔄 Инициализация библиотеки...');
        loadBooks();
        setupEventListeners();
        setupDragAndDrop();
    }

    function loadBooks() {
        console.log('📥 Загрузка книг...');
        
        // Всегда показываем состояние загрузки
        if (booksContainer) {
            booksContainer.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div class="loading-spinner"></div>
                    <h3 style="color: #fff; margin: 20px 0 10px;">Загрузка библиотеки...</h3>
                    <p style="color: #94a3b8;">Пожалуйста, подождите</p>
                </div>
            `;
        }

        // Сначала пробуем загрузить из JSON файла (основной источник)
        loadBooksFromJSON()
            .then(() => {
                console.log('✅ Книги успешно загружены из JSON');
            })
            .catch(error => {
                console.error('❌ Ошибка загрузки из JSON:', error);
                // Если JSON не загрузился, пробуем localStorage
                loadBooksFromLocalStorage();
            });
    }

    function loadBooksFromJSON() {
        return new Promise((resolve, reject) => {
            console.log('📁 Загрузка из data_lib/library.json...');
            
            fetch('data_lib/library.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('✅ JSON загружен:', data.length, 'книг');
                    
                    if (!Array.isArray(data)) {
                        throw new Error('Некорректный формат JSON: ожидался массив');
                    }
                    
                    books = data;
                    
                    if (books.length === 0) {
                        showEmptyLibrary();
                    } else {
                        renderBooks(books);
                        populateGenres(books);
                    }
                    
                    // Сохраняем в localStorage как резервную копию
                    localStorage.setItem('allBooks', JSON.stringify(books));
                    
                    resolve();
                })
                .catch(error => {
                    console.error('❌ Ошибка загрузки JSON:', error);
                    reject(error);
                });
        });
    }

    function loadBooksFromLocalStorage() {
        console.log('📁 Загрузка из localStorage...');
        
        const savedBooks = localStorage.getItem('allBooks');
        
        if (savedBooks) {
            try {
                books = JSON.parse(savedBooks);
                console.log('✅ Книги загружены из localStorage:', books.length, 'книг');
                
                if (books.length === 0) {
                    showEmptyLibrary();
                } else {
                    renderBooks(books);
                    populateGenres(books);
                    showMessage('Библиотека загружена из резервной копии', 'info');
                }
            } catch (error) {
                console.error('❌ Ошибка парсинга localStorage:', error);
                showTestData();
            }
        } else {
            console.log('📁 localStorage пуст, загружаем тестовые данные');
            showTestData();
        }
    }

    function showEmptyLibrary() {
        if (booksContainer) {
            booksContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">📚</div>
                    <h3 style="color: #fff; margin-bottom: 15px;">Библиотека пуста</h3>
                    <p style="color: #94a3b8; margin-bottom: 25px;">Добавьте свою первую книгу</p>
                    <button class="add-book-button" onclick="openAddBookModal()">
                        + Добавить книгу
                    </button>
                </div>
            `;
        }
    }

    function showTestData() {
        console.log('🔄 Загрузка тестовых данных...');
        
        books = [
            {
                id: "1",
                title: "Мастер и Маргарита",
                author: "Михаил Булгаков",
                genre: "Классика",
                description: "Один из величайших романов XX века, сочетающий мистику, сатиру и философскую прозу.",
                addedDate: "2024-01-15",
                cover: "",
                filePath: "books/master_i_margarita.pdf"
            },
            {
                id: "2", 
                title: "1984",
                author: "Джордж Оруэлл",
                genre: "Антиутопия",
                description: "Знаменитая антиутопия о тоталитарном обществе и потере индивидуальности.",
                addedDate: "2024-01-17", 
                cover: "",
                filePath: "books/1984.epub"
            }
        ];
        
        renderBooks(books);
        populateGenres(books);
        localStorage.setItem('allBooks', JSON.stringify(books));
        
        showMessage('Загружены демонстрационные книги', 'info');
    }

    function reloadFromJSON() {
        console.log('🔄 Принудительная перезагрузка из JSON...');
        loadBooksFromJSON()
            .then(() => {
                showMessage('Библиотека перезагружена из JSON файла', 'success');
            })
            .catch(error => {
                showMessage('Ошибка перезагрузки из JSON: ' + error.message, 'error');
            });
    }

    function setupEventListeners() {
        // Поиск и фильтрация
        if (searchInput) searchInput.addEventListener('input', applyFilters);
        if (genreFilter) genreFilter.addEventListener('change', applyFilters);
        if (sortSelect) sortSelect.addEventListener('change', applyFilters);
        
        // Модальное окно
        if (addBookBtn) addBookBtn.addEventListener('click', openAddBookModal);
        
        // Закрытие модального окна
        const closeButtons = document.querySelectorAll('.close, #cancel-btn');
        closeButtons.forEach(btn => {
            if (btn) btn.addEventListener('click', closeAddBookModal);
        });

        // Закрытие по клику вне модального окна
        window.addEventListener('click', (event) => {
            if (event.target === addBookModal) {
                closeAddBookModal();
            }
        });

        // Форма добавления книги
        if (bookForm) {
            bookForm.addEventListener('submit', handleAddBookSubmit);
        }

        // Превью обложки
        if (coverImageInput) {
            coverImageInput.addEventListener('change', handleCoverPreview);
        }

        // Добавляем кнопку перезагрузки
        addReloadButton();

        console.log('✅ Все обработчики событий установлены');
    }

    function addReloadButton() {
        const controls = document.querySelector('.control-buttons');
        if (!controls) return;

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'reload-button';
        reloadBtn.innerHTML = '🔄 Обновить';
        reloadBtn.title = 'Перезагрузить библиотеку из JSON файла';
        reloadBtn.addEventListener('click', reloadFromJSON);

        controls.appendChild(reloadBtn);
    }

    function setupDragAndDrop() {
        if (!dropZone) return;

        // Предотвращаем стандартное поведение
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Подсветка зоны drop
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, highlightDropZone, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, unhighlightDropZone, false);
        });

        // Обработка drop
        dropZone.addEventListener('drop', handleDrop, false);

        function highlightDropZone() {
            if (dropZone) {
                dropZone.style.display = 'flex';
                setTimeout(() => {
                    dropZone.style.opacity = '1';
                }, 10);
            }
        }

        function unhighlightDropZone() {
            if (dropZone) {
                dropZone.style.opacity = '0';
                setTimeout(() => {
                    dropZone.style.display = 'none';
                }, 300);
            }
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleDroppedFiles(files);
        }
        
        console.log('✅ Drag and Drop настроен');
    }

    function handleDroppedFiles(files) {
        console.log('📁 Перетащены файлы:', files);
        
        const bookFiles = Array.from(files).filter(file => {
            const extension = file.name.split('.').pop().toLowerCase();
            return ['pdf', 'epub', 'txt', 'fb2'].includes(extension);
        });

        if (bookFiles.length > 0) {
            openAddBookModal();
            console.log(`✅ Обнаружено ${bookFiles.length} книг(и)`);
            showMessage(`Обнаружено ${bookFiles.length} книг(и). Заполните информацию о книге.`, 'info');
        } else {
            console.warn('⚠️ Нет подходящих файлов книг');
            showMessage('Пожалуйста, перетащите файлы книг (PDF, EPUB, TXT, FB2)', 'error');
        }
    }

    function openAddBookModal() {
        console.log('📖 Открытие модального окна добавления книги');
        if (addBookModal) {
            addBookModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeAddBookModal() {
        console.log('📖 Закрытие модального окна');
        if (addBookModal) {
            addBookModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (bookForm) {
            bookForm.reset();
        }
        if (coverPreview) {
            coverPreview.innerHTML = '';
            coverPreview.style.display = 'none';
        }
    }

    function handleCoverPreview(event) {
        const file = event.target.files[0];
        if (file && coverPreview) {
            console.log('🖼️ Загрузка превью обложки:', file.name);
            const reader = new FileReader();
            reader.onload = function(e) {
                coverPreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">`;
                coverPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    function handleAddBookSubmit(event) {
        event.preventDefault();
        console.log('📝 Обработка добавления книги...');
        
        const formData = new FormData(bookForm);
        const title = formData.get('title');
        const author = formData.get('author');
        
        if (!title || !author) {
            showMessage('Пожалуйста, заполните обязательные поля: название и автор', 'error');
            return;
        }

        const newBook = {
            id: generateBookId(),
            title: title,
            author: author,
            genre: formData.get('genre') || 'Без жанра',
            description: formData.get('description') || '',
            addedDate: new Date().toISOString().split('T')[0],
            cover: '',
            filePath: ''
        };

        // Обработка файла книги
        const bookFile = document.getElementById('book-file').files[0];
        if (bookFile) {
            // В реальном приложении здесь должна быть загрузка файла
            newBook.filePath = `books/${bookFile.name}`;
            console.log('📁 Файл книги:', bookFile.name);
        }

        // Обработка обложки
        const coverFile = document.getElementById('cover-image').files[0];
        if (coverFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newBook.cover = e.target.result;
                addBookToLibrary(newBook);
            };
            reader.readAsDataURL(coverFile);
        } else {
            addBookToLibrary(newBook);
        }
    }

    function addBookToLibrary(book) {
        console.log('➕ Добавляем новую книгу:', book);
        
        books.unshift(book);
        
        // Обновляем отображение
        renderBooks(books);
        populateGenres(books);
        
        // Сохраняем обновленный список
        localStorage.setItem('allBooks', JSON.stringify(books));
        
        // Закрываем модальное окно
        closeAddBookModal();
        
        // Показываем уведомление
        showMessage(`Книга "${book.title}" успешно добавлена!`, 'success');
    }

    function generateBookId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function renderBooks(booksToRender) {
        if (!booksContainer) {
            console.error('❌ Элемент books-container не найден в DOM');
            return;
        }
        
        console.log('🎨 Отрисовка книг:', booksToRender.length);

        if (booksToRender.length === 0) {
            showEmptyLibrary();
            return;
        }

        booksContainer.innerHTML = booksToRender.map(book => {
            const title = book.title || 'Без названия';
            const author = book.author || 'Неизвестный автор';
            const genre = book.genre || 'Без жанра';
            const description = book.description || '';
            
            let dateText = '';
            try {
                const date = book.addedDate || book.dateAdded || book.date;
                dateText = date ? new Date(date).toLocaleDateString('ru-RU') : 'Дата не указана';
            } catch (e) {
                dateText = 'Дата не указана';
            }

            const coverContent = book.cover ? 
                `<img src="${book.cover}" alt="${title}" class="book-cover-img">` : 
                '<div class="book-cover-placeholder">📖</div>';

            return `
                <div class="book-card" data-book-id="${book.id}">
                    <div class="book-cover">
                        ${coverContent}
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${escapeHtml(title)}</h3>
                        <p class="book-author">${escapeHtml(author)}</p>
                        <p class="book-genre">${escapeHtml(genre)}</p>
                        <p class="book-date">${escapeHtml(dateText)}</p>
                        ${description ? `<p class="book-description">${escapeHtml(description)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Добавляем обработчики кликов
        const bookCards = booksContainer.querySelectorAll('.book-card');
        console.log(`🎯 Добавлено обработчиков для ${bookCards.length} карточек`);
        
        bookCards.forEach(card => {
            card.addEventListener('click', function() {
                const bookId = this.getAttribute('data-book-id');
                console.log('🖱️ Клик по книге с ID:', bookId);
                openBookView(bookId);
            });
        });
    }

    function applyFilters() {
        const searchText = (searchInput?.value || '').toLowerCase();
        const genre = genreFilter?.value || 'all';
        const sortBy = sortSelect?.value || 'title';

        console.log(`🔍 Применение фильтров: поиск="${searchText}", жанр="${genre}", сортировка="${sortBy}"`);

        let filtered = books.filter(book => {
            const bookTitle = (book.title || '').toLowerCase();
            const bookAuthor = (book.author || '').toLowerCase();
            const bookGenre = (book.genre || '').toLowerCase();
            const bookDescription = (book.description || '').toLowerCase();
            
            const matchesSearch = searchText === '' || 
                bookTitle.includes(searchText) ||
                bookAuthor.includes(searchText) ||
                bookDescription.includes(searchText);
            
            const matchesGenre = genre === 'all' || bookGenre === genre.toLowerCase();
            
            return matchesSearch && matchesGenre;
        });

        console.log(`📊 После фильтрации: ${filtered.length} книг`);

        // Сортировка
        if (sortBy === 'title') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortBy === 'author') {
            filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
        } else if (sortBy === 'date-added') {
            filtered.sort((a, b) => {
                const dateA = new Date(a.addedDate || a.dateAdded || a.date || 0);
                const dateB = new Date(b.addedDate || b.dateAdded || b.date || 0);
                return dateB - dateA;
            });
        }

        renderBooks(filtered);
    }

    function populateGenres(books) {
        if (!genreFilter) {
            console.error('❌ Элемент genre-filter не найден');
            return;
        }
        
        console.log('🎭 Заполнение списка жанров...');
        
        // Очищаем все опции кроме "Все жанры"
        while (genreFilter.children.length > 1) {
            genreFilter.removeChild(genreFilter.lastChild);
        }

        const genres = [...new Set(books.map(b => b.genre).filter(genre => genre && genre.trim() !== ''))];
        genres.sort();
        
        console.log('📋 Найдены жанры:', genres);
        
        genres.forEach(genre => {
            const opt = document.createElement('option');
            opt.value = genre;
            opt.textContent = genre;
            genreFilter.appendChild(opt);
        });
    }

    function showMessage(message, type = 'info') {
        console.log(`💬 Показать сообщение (${type}):`, message);
        
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : 
                       type === 'error' ? '#ef4444' : '#3b82f6';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 400px;
            font-weight: 500;
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

    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #334155;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Глобальные функции
    window.openBookView = function(bookId) {
        console.log('🔄 openBookView вызван с ID:', bookId);
        
        if (!bookId) {
            console.error('❌ Не передан ID книги');
            showMessage('Ошибка: не указан ID книги', 'error');
            return;
        }
        
        // Проверяем, существует ли книга
        const book = books.find(b => b.id === bookId);
        if (!book) {
            console.error('❌ Книга не найдена в локальном массиве');
            showMessage(`Книга с ID "${bookId}" не найдена!`, 'error');
            return;
        }
        
        console.log('✅ Книга найдена:', book.title);
        
        // Сохраняем ID книги для страницы просмотра
        localStorage.setItem('currentBookId', bookId);
        
        // Переходим на страницу просмотра книги в ТЕКУЩЕМ окне
        console.log('🔗 Переход на book-view.html в текущем окне...');
        window.location.href = 'book-view.html';
    };
    window.openAddBookModal = openAddBookModal;
    window.reloadFromJSON = reloadFromJSON;

    // Запускаем приложение
    init();
});