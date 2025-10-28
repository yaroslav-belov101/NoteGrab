const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Страница просмотра книги загружена');
    
    // Загружаем данные книги
    loadBookData();
});

function loadBookData() {
    const bookId = localStorage.getItem('currentBookId');
    const savedBooks = localStorage.getItem('allBooks');
    
    console.log('📖 Загрузка данных книги:', bookId);

    if (!bookId) {
        showError('Книга не выбрана. Вернитесь в библиотеку и выберите книгу.');
        return;
    }

    if (savedBooks) {
        try {
            const books = JSON.parse(savedBooks);
            const book = books.find(b => b.id === bookId);
            
            if (book) {
                console.log('✅ Книга найдена:', book);
                renderBookDetails(book);
            } else {
                showError(`Книга с ID "${bookId}" не найдена.`);
            }
        } catch (error) {
            console.error('❌ Ошибка парсинга книг:', error);
            showError('Ошибка загрузки данных книги.');
        }
    } else {
        // Если нет сохраненных книг, пробуем загрузить из JSON
        loadBookFromJSON(bookId);
    }
}

async function checkBookFile(book) {
    if (!book.filePath) {
        return { exists: false, error: 'Путь к файлу не указан' };
    }
    
    try {
        const { ipcRenderer } = require('electron');
        const fileExists = await ipcRenderer.invoke('file-exists', book.filePath);
        return { exists: fileExists, error: fileExists ? null : 'Файл не найден' };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

function loadBookFromJSON(bookId) {
    console.log('📥 Загрузка книги из JSON...');
    
    fetch('data_lib/library.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка загрузки файла библиотеки');
            }
            return response.json();
        })
        .then(books => {
            const book = books.find(b => b.id === bookId);
            if (book) {
                renderBookDetails(book);
            } else {
                showError('Книга не найдена в библиотеке');
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            showError('Не удалось загрузить данные книги: ' + error.message);
        });
}

async function renderBookDetails(book) {
    const container = document.getElementById('book-details');
    
    if (!container) {
        console.error('Контейнер book-details не найден');
        return;
    }

    // Проверяем существование файла
    const fileCheck = await checkBookFile(book);
    
    const title = book.title || 'Без названия';
    const author = book.author || 'Неизвестный автор';
    const genre = book.genre || 'Не указан';
    const description = book.description || 'Описание отсутствует';
    
    let dateText = '';
    try {
        const date = book.addedDate || book.dateAdded || book.date;
        dateText = date ? new Date(date).toLocaleDateString('ru-RU') : 'Дата не указана';
    } catch (e) {
        dateText = 'Дата не указана';
    }

    const coverContent = book.cover ? 
        `<img src="${book.cover}" alt="${title}" class="book-cover-large">` : 
        `<div class="book-cover-placeholder">📖</div>`;

    // Статус файла
    const fileStatus = fileCheck.exists ? 
        '<span style="color: #10b981;">✅ Файл доступен</span>' : 
        `<span style="color: #ef4444;">❌ Файл недоступен: ${fileCheck.error}</span>`;

    container.innerHTML = `
        <div class="book-header">
            <div class="book-cover-section">
                ${coverContent}
            </div>
        </div>
        
        <div class="book-info-section">
            <h1 class="book-title-large">${escapeHtml(title)}</h1>
            <p class="book-author-large">${escapeHtml(author)}</p>
            
            <div class="book-meta-info">
                <div class="meta-item">
                    <span class="meta-label">Жанр:</span>
                    <span class="meta-value">${escapeHtml(genre)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Добавлена:</span>
                    <span class="meta-value">${escapeHtml(dateText)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Формат:</span>
                    <span class="meta-value">${getFileFormat(book.filePath)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Статус:</span>
                    <span class="meta-value">${fileStatus}</span>
                </div>
            </div>
            
            <div class="book-description-section">
                <h3>Описание</h3>
                <p class="book-description-full">${escapeHtml(description)}</p>
            </div>
            
            <div class="book-actions">
                <button class="read-button" onclick="startReading('${escapeHtml(book.id)}')" ${!fileCheck.exists ? 'disabled' : ''}>
                    📖 ${fileCheck.exists ? 'Начать чтение' : 'Файл недоступен'}
                </button>
                ${!fileCheck.exists ? `
                <p style="color: #ef4444; margin-top: 10px; font-size: 0.9em;">
                    Файл книги не найден по пути: ${book.filePath}
                </p>
                ` : ''}
            </div>
        </div>
    `;
    
    console.log('✅ Детали книги отрисованы');
}

function getFileFormat(filePath) {
    if (!filePath) return 'Не указан';
    
    const extension = filePath.split('.').pop().toLowerCase();
    const formats = {
        'pdf': 'PDF',
        'epub': 'EPUB', 
        'txt': 'Текст',
        'fb2': 'FB2'
    };
    
    return formats[extension] || extension.toUpperCase();
}

function startReading(bookId) {
    console.log('📖 Запуск чтения книги в текущем окне:', bookId);
    
    // Сохраняем данные книги для читалки
    const savedBooks = localStorage.getItem('allBooks');
    if (savedBooks) {
        const books = JSON.parse(savedBooks);
        const book = books.find(b => b.id === bookId);
        
        if (book) {
            // Сохраняем данные книги для читалки
            localStorage.setItem('currentReadingBookId', bookId);
            localStorage.setItem('currentReadingBook', JSON.stringify(book));
            
            // Открываем читалку в ТЕКУЩЕМ окне
            console.log('🔗 Переход на book-reader.html в текущем окне...');
            window.location.href = 'book-reader.html';
        } else {
            alert('Книга не найдена в библиотеке!');
        }
    } else {
        alert('Данные библиотеки не загружены!');
    }
}

function goBackToLibrary() {
    console.log('🔙 Возврат в библиотеку');
    window.location.href = 'library.html';
}

function showError(message) {
    const container = document.getElementById('book-details');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h2>Ошибка</h2>
                <p>${message}</p>
                <button class="back-button" onclick="goBackToLibrary()" style="margin-top: 20px;">
                    ← Вернуться в библиотеку
                </button>
            </div>
        `;
    }
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

// Добавляем стили для загрузки
const style = document.createElement('style');
style.textContent = `
    .loading-state {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
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