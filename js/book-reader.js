    const { ipcRenderer } = require('electron');
    const path = require('path');
    const { spawn } = require('child_process');
    const fs = require('fs');

    // Проверяем доступность библиотек
    let pdfParse, EPub;
    try {
        pdfParse = require('pdf-parse');
        EPub = require('epub');
    } catch (error) {
        console.warn('Библиотеки не установлены:', error.message);
    }

    let currentBook = null;
    let currentPage = 1;
    let totalPages = 1;
    let isPDF = false;
    let epubInstance = null;
    let bookContent = '';
    let pages = [];
    const CHARS_PER_PAGE = 2000;

    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 Читалка инициализируется');
        
        hideLoadingSpinner();
        loadBookData();
        setupEventListeners();
        loadReaderSettings();
    });

    function hideLoadingSpinner() {
        const loadingState = document.querySelector('.loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    async function loadBookData() {
        const bookId = localStorage.getItem('currentReadingBookId');
        const bookData = localStorage.getItem('currentReadingBook');
        
        console.log('📖 Загрузка книги для чтения:', bookId);
        
        if (!bookId || !bookData) {
            showError('Данные книги не найдены.');
            return;
        }
        
        try {
            currentBook = JSON.parse(bookData);
            console.log('✅ Книга загружена:', currentBook);
            
            document.getElementById('reader-book-title').textContent = currentBook.title;
            document.getElementById('reader-book-author').textContent = currentBook.author;
            
            await loadBookContent();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных книги:', error);
            showError('Ошибка загрузки данных книги');
        }
    }

    async function loadBookContent() {
        const filePath = currentBook.filePath;
        
        if (!filePath) {
            showFileNotFound();
            return;
        }
        
        console.log('📁 Загрузка контента:', filePath);
        
        showFileInfo(filePath);
        
        const fileExists = await ipcRenderer.invoke('file-exists', filePath);
        
        if (!fileExists) {
            showFileNotFound();
            return;
        }
        
        const fileExtension = getFileExtension(filePath);
        
        if (fileExtension === 'pdf') {
            await loadPDF(filePath);
        } else if (fileExtension === 'epub') {
            await loadEPUB(filePath);
        } else if (fileExtension === 'txt') {
            await loadTXT(filePath);
        } else if (fileExtension === 'fb2') {
            await loadFB2(filePath);
        } else {
            showUnsupportedFormat();
        }
    }

    function getFileExtension(filePath) {
        return filePath ? filePath.split('.').pop().toLowerCase() : '';
    }

    function showFileInfo(filePath) {
        const textContent = document.getElementById('text-content');
        const pdfContainer = document.getElementById('pdf-container');
        
        pdfContainer.style.display = 'none';
        textContent.style.display = 'block';
        
        textContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <h2 style="color: #fff; margin-bottom: 15px;">Загрузка файла</h2>
                <p style="color: #94a3b8;">Обработка: ${path.basename(filePath)}</p>
                <p style="color: #64748b; font-size: 0.9em; margin-top: 10px;">${filePath}</p>
            </div>
        `;
    }

    // ==================== PDF ФУНКЦИОНАЛ ====================

    async function loadPDF(filePath) {
        console.log('📄 Загрузка PDF:', filePath);
        isPDF = true;
        
        try {
            const absolutePath = await ipcRenderer.invoke('get-file-path', filePath);
            
            if (!absolutePath) {
                throw new Error('Не удалось получить путь к файлу');
            }
            
            console.log('📄 Абсолютный путь к PDF:', absolutePath);
            
            // Пробуем разные методы по порядку
            let success = false;
            
            // Метод 1: Используем pdf-parse если доступен
            if (pdfParse) {
                console.log('🔄 Метод 1: Используем pdf-parse');
                success = await loadPDFWithPDFParse(absolutePath);
            }
            
            // Метод 2: Если pdf-parse не сработал, пробуем простой метод
            if (!success) {
                console.log('🔄 Метод 2: Используем простой парсинг');
                success = await loadPDFSimple(absolutePath);
            }
            
            // Метод 3: Если ничего не сработало, показываем информацию о файле
            if (!success) {
                console.log('🔄 Метод 3: Показываем информацию о файле');
                showPDFInfo(absolutePath);
                showMessage('PDF содержит изображения или защищен от копирования', 'warning');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки PDF:', error);
            showPDFFallback(filePath, error.message);
        }
    }

    async function loadPDFWithPDFParse(filePath) {
        try {
            const result = await ipcRenderer.invoke('read-binary-file', filePath);
            
            if (!result.success) {
                return false;
            }
            
            const buffer = Buffer.from(result.content, 'binary');
            const data = await pdfParse(buffer);
            
            console.log('📊 PDF информация:', {
                pages: data.numpages,
                textLength: data.text.length,
                hasText: data.text.length > 0
            });
            
            if (data.text && data.text.length > 100) {
                bookContent = data.text;
                createPagesFromText(bookContent);
                showPage(currentPage);
                showMessage(`PDF загружен: ${data.numpages} страниц`, 'success');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ pdf-parse не сработал:', error);
            return false;
        }
    }

    async function loadPDFSimple(filePath) {
        try {
            const result = await ipcRenderer.invoke('read-binary-file', filePath);
            
            if (!result.success) {
                return false;
            }
            
            const extractedText = extractTextFromPDF(result.content);
            
            if (extractedText && extractedText.length > 100) {
                bookContent = extractedText;
                createPagesFromText(bookContent);
                showPage(currentPage);
                showMessage('PDF загружен (простой метод)', 'success');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Простой метод не сработал:', error);
            return false;
        }
    }

    function extractTextFromPDF(binaryData) {
        console.log('🔄 Извлечение текста из PDF...');
        
        const textChunks = [];
        
        try {
            // Метод 1: Ищем текст в скобках (самый распространенный в PDF)
            const bracketText = binaryData.match(/\(([^)]+)\)/g);
            if (bracketText) {
                bracketText.forEach(match => {
                    const text = match.slice(1, -1);
                    // Фильтруем только читаемый текст
                    if (text.length > 2 && /[а-яА-Яa-zA-Z]/.test(text)) {
                        textChunks.push(text);
                    }
                });
            }
            
            // Метод 2: Ищем последовательности букв
            const wordPattern = /[а-яА-Яa-zA-Z][а-яА-Яa-zA-Z\s.,!?;:"'\-()]{5,}/g;
            const wordMatches = binaryData.match(wordPattern);
            if (wordMatches) {
                wordMatches.forEach(text => {
                    const cleanText = text.trim();
                    if (cleanText.length > 5) {
                        textChunks.push(cleanText);
                    }
                });
            }
            
            // Метод 3: Ищем hex-encoded текст
            const hexPattern = /<([0-9A-Fa-f\s]+)>/g;
            const hexMatches = binaryData.match(hexPattern);
            if (hexMatches) {
                hexMatches.forEach(match => {
                    const hex = match.slice(1, -1).replace(/\s/g, '');
                    if (hex.length >= 4) {
                        try {
                            const text = hexToText(hex);
                            if (text.length > 3 && /[а-яА-Яa-zA-Z]/.test(text)) {
                                textChunks.push(text);
                            }
                        } catch (e) {
                            // Игнорируем ошибки конвертации
                        }
                    }
                });
            }
            
            const result = textChunks.join(' ').substring(0, 50000);
            console.log(`📝 Извлечено текста: ${result.length} символов`);
            
            return result.length > 100 ? result : null;
            
        } catch (error) {
            console.error('❌ Ошибка извлечения текста:', error);
            return null;
        }
    }

    function hexToText(hex) {
        let text = '';
        for (let i = 0; i < hex.length; i += 2) {
            const byte = hex.substr(i, 2);
            if (byte.length === 2) {
                const charCode = parseInt(byte, 16);
                // Фильтруем только печатные символы
                if (charCode >= 32 && charCode <= 126) {
                    text += String.fromCharCode(charCode);
                } else if (charCode >= 1040 && charCode <= 1103) {
                    // Кириллические символы
                    text += String.fromCharCode(charCode);
                }
            }
        }
        return text;
    }

    function showPDFInfo(filePath) {
        const textContent = document.getElementById('text-content');
        
        textContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                    <h1 style="color: #fff; margin-bottom: 10px;">${currentBook.title}</h1>
                    <h2 style="color: #94a3b8; margin-bottom: 20px;">${currentBook.author}</h2>
                </div>
                
                <div style="background: rgba(251, 191, 36, 0.1); padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                    <h3 style="color: #fbbf24; margin-bottom: 15px;">📊 Информация о PDF файле</h3>
                    <div style="color: #fbbf24; line-height: 1.6;">
                        <p><strong>Файл:</strong> ${path.basename(filePath)}</p>
                        <p><strong>Путь:</strong> ${filePath}</p>
                        <p><strong>Статус:</strong> Файл загружен, но текст не извлечен</p>
                    </div>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h4 style="color: #3b82f6; margin-bottom: 15px;">💡 Возможные причины:</h4>
                    <ul style="color: #3b82f6; text-align: left; padding-left: 20px;">
                        <li>PDF содержит текст в виде изображений (сканированные страницы)</li>
                        <li>Файл защищен от копирования текста</li>
                        <li>Используются специальные шрифты</li>
                        <li>Файл поврежден или имеет нестандартный формат</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <button class="reader-control-btn" onclick="openInSystemViewer('${filePath}')" style="margin: 10px;">
                        📂 Открыть в системном просмотрщике
                    </button>
                    <button class="reader-control-btn" onclick="convertPDFToText('${filePath}')" style="margin: 10px;">
                        🔄 Попробовать OCR (экспериментально)
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== EPUB ФУНКЦИОНАЛ ====================

    async function loadEPUB(filePath) {
        console.log('📖 Загрузка EPUB:', filePath);
        isPDF = false;
        
        if (!EPub) {
            showEPUBFallback(filePath, 'Библиотека epub не доступна');
            return;
        }
        
        try {
            const absolutePath = await ipcRenderer.invoke('get-file-path', filePath);
            epubInstance = new EPub(absolutePath);
            await parseEPUB(epubInstance);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки EPUB:', error);
            showEPUBFallback(filePath, error.message);
        }
    }

    function parseEPUB(epub) {
        return new Promise((resolve, reject) => {
            let fullText = '';
            
            epub.on('end', function() {
                console.log('✅ EPUB метаданные загружены');
                
                let chaptersProcessed = 0;
                const totalChapters = epub.flow.length;
                
                if (totalChapters === 0) {
                    reject(new Error('В EPUB файле не найдено глав'));
                    return;
                }
                
                epub.flow.forEach(function(chapter) {
                    epub.getChapter(chapter.id, function(error, text) {
                        chaptersProcessed++;
                        
                        if (!error && text) {
                            const cleanText = stripHtmlTags(text);
                            fullText += cleanText + '\n\n';
                        }
                        
                        if (chaptersProcessed === totalChapters) {
                            bookContent = fullText;
                            createPagesFromText(bookContent);
                            showPage(currentPage);
                            showMessage(`EPUB загружен: ${totalChapters} глав`, 'success');
                            resolve();
                        }
                    });
                });
            });
            
            epub.on('error', reject);
            epub.parse();
        });
    }

    // ==================== ТЕКСТОВЫЕ ФОРМАТЫ ====================

    async function loadTXT(filePath) {
        console.log('📝 Загрузка TXT:', filePath);
        isPDF = false;
        
        try {
            const result = await ipcRenderer.invoke('read-file', filePath);
            
            if (result.success) {
                bookContent = result.content;
                createPagesFromText(bookContent);
                showPage(currentPage);
                showMessage('Текстовый файл загружен', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки TXT:', error);
            showFileNotFound();
        }
    }

    async function loadFB2(filePath) {
        await loadEPUB(filePath);
    }

    // ==================== СИСТЕМА СТРАНИЦ ====================

    function createPagesFromText(text) {
        pages = [];
        
        if (!text || text.trim().length === 0) {
            pages.push('Текст не найден или пуст');
            totalPages = 1;
            updateNavigation();
            return;
        }
        
        // Разбиваем текст на страницы
        for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
            pages.push(text.substring(i, i + CHARS_PER_PAGE));
        }
        
        totalPages = pages.length;
        console.log(`📄 Создано ${totalPages} страниц`);
        
        updateNavigation();
        updateProgress();
    }

    function showPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        
        currentPage = pageNumber;
        const pageContent = pages[pageNumber - 1];
        
        const textContent = document.getElementById('text-content');
        textContent.style.display = 'block';
        textContent.innerHTML = formatPageContent(pageContent, pageNumber);
        
        updateNavigation();
        updateProgress();
        textContent.scrollTop = 0;
    }

    function formatPageContent(content, pageNumber) {
        const formattedText = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<p style="margin: 12px 0; line-height: 1.6; text-align: justify;">${escapeHtml(line)}</p>`)
            .join('');
        
        return `
            <div style="max-width: 900px; margin: 0 auto; padding: 30px 40px;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #334155; padding-bottom: 20px;">
                    <h1 style="color: #fff; margin-bottom: 8px; font-size: 1.8em;">${currentBook.title}</h1>
                    <h2 style="color: #94a3b8; margin-bottom: 15px; font-size: 1.2em;">${currentBook.author}</h2>
                    <div style="color: #64748b; font-size: 0.9em;">Страница ${pageNumber} из ${totalPages}</div>
                </div>
                
                <div style="color: #e2e8f0; min-height: 500px;">
                    ${formattedText}
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; color: #64748b;">
                    — ${pageNumber} —
                </div>
            </div>
        `;
    }

    // ==================== НАВИГАЦИЯ И ИНТЕРФЕЙС ====================

    function updateNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const pageInfo = document.getElementById('page-info');
        
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        if (pageInfo) pageInfo.textContent = `Страница: ${currentPage} / ${totalPages}`;
    }

    function updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        
        if (progressFill && progressPercent) {
            const progress = (currentPage / totalPages) * 100;
            progressFill.style.width = progress + '%';
            progressPercent.textContent = Math.round(progress) + '%';
        }
    }

    function previousPage() {
        if (currentPage > 1) showPage(currentPage - 1);
    }

    function nextPage() {
        if (currentPage < totalPages) showPage(currentPage + 1);
    }

    function goToPage(pageNumber) {
        const page = parseInt(pageNumber);
        if (page >= 1 && page <= totalPages) showPage(page);
    }

    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

    function stripHtmlTags(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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

    function openInSystemViewer(filePath) {
        const { shell } = require('electron');
        shell.openPath(filePath).catch(error => {
            showMessage('Ошибка открытия файла', 'error');
        });
    }

    // ==================== СООБЩЕНИЯ ОБ ОШИБКАХ ====================

    function showPDFFallback(filePath, errorMessage) {
        showPDFInfo(filePath);
    }

    function showEPUBFallback(filePath, errorMessage) {
        const textContent = document.getElementById('text-content');
        textContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📖</div>
                <h2 style="color: #fff; margin-bottom: 15px;">Ошибка загрузки EPUB</h2>
                <p style="color: #94a3b8;">${errorMessage}</p>
                <button class="reader-control-btn" onclick="openInSystemViewer('${filePath}')" style="margin-top: 20px;">
                    📂 Открыть в системной читалке
                </button>
            </div>
        `;
    }

    function showUnsupportedFormat() {
        showError('Неподдерживаемый формат файла');
    }

    function showFileNotFound() {
        showError('Файл книги не найден');
    }

    function showError(message) {
        const textContent = document.getElementById('text-content');
        textContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: #fff; margin-bottom: 15px;">Ошибка</h2>
                <p style="color: #94a3b8;">${message}</p>
            </div>
        `;
    }

    function showMessage(message, type = 'info') {
        const bgColor = type === 'error' ? '#ef4444' : 
                    type === 'success' ? '#10b981' : 
                    type === 'warning' ? '#f59e0b' : '#3b82f6';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: ${bgColor}; color: white;
            padding: 12px 20px; border-radius: 8px; z-index: 10000; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease; max-width: 400px; font-size: 14px;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ==================== НАСТРОЙКИ ====================

    function setupEventListeners() {
        // Настройки читалки
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsPanel.classList.toggle('show');
            });
            
            document.addEventListener('click', () => {
                settingsPanel.classList.remove('show');
            });
            
            document.getElementById('font-size').addEventListener('change', (e) => {
                applyFontSize(e.target.value);
            });
            
            document.getElementById('theme').addEventListener('change', (e) => {
                applyTheme(e.target.value);
            });
        }
        
        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft': case 'PageUp': e.preventDefault(); previousPage(); break;
                case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); nextPage(); break;
                case 'Home': e.preventDefault(); showPage(1); break;
                case 'End': e.preventDefault(); showPage(totalPages); break;
                case 'Escape': closeReader(); break;
            }
        });
    }

    function applyFontSize(size) {
        const textContent = document.getElementById('text-content');
        if (textContent) textContent.style.fontSize = size + 'px';
        saveReaderSettings();
    }

    function applyTheme(theme) {
        const body = document.body;
        const textContent = document.getElementById('text-content');
        
        body.className = '';
        textContent.className = '';
        
        if (theme !== 'dark') {
            body.classList.add(`theme-${theme}`);
            textContent.classList.add(`theme-${theme}`);
        }
        
        saveReaderSettings();
    }

    function loadReaderSettings() {
        const settings = JSON.parse(localStorage.getItem('readerSettings') || '{}');
        
        const fontSizeSelect = document.getElementById('font-size');
        const themeSelect = document.getElementById('theme');
        
        if (fontSizeSelect && settings.fontSize) {
            fontSizeSelect.value = settings.fontSize;
            applyFontSize(settings.fontSize);
        }
        
        if (themeSelect && settings.theme) {
            themeSelect.value = settings.theme;
            applyTheme(settings.theme);
        }
    }

    function saveReaderSettings() {
        const fontSizeSelect = document.getElementById('font-size');
        const themeSelect = document.getElementById('theme');
        
        if (fontSizeSelect && themeSelect) {
            const settings = {
                fontSize: fontSizeSelect.value,
                theme: themeSelect.value
            };
            localStorage.setItem('readerSettings', JSON.stringify(settings));
        }
    }

    function closeReader() {
        ipcRenderer.invoke('close-reader-window').catch(() => window.close());
    }

    // Глобальные функции
    window.previousPage = previousPage;
    window.nextPage = nextPage;
    window.closeReader = closeReader;
    window.openInSystemViewer = openInSystemViewer;
    window.goToPage = goToPage;
    window.convertPDFToText = function(filePath) {
        showMessage('OCR функционал в разработке', 'info');
    };

    // Стили
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            width: 40px; height: 40px; border: 3px solid #334155; border-top: 3px solid #667eea;
            border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .theme-light { background: #f8fafc !important; color: #1e293b !important; }
        .theme-sepia { background: #fef3c7 !important; color: #78350f !important; }
    `;
    document.head.appendChild(style);