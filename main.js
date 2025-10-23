const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let readerWindow = null;

// Убираем стандартное меню
Menu.setApplicationMenu(null);

function createMainWindow() {
  // Создаем главное окно без стандартного меню
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    show: false,
    title: 'NoteGrab - Библиотека',
    icon: path.join(__dirname, 'assets/icon.png'),
    // Убираем стандартное меню
    autoHideMenuBar: true,
    titleBarStyle: 'default'
  });

  // Убираем меню полностью
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile('main_menu.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.center();
  });

  // Открываем DevTools в development режиме
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Обработка внешних ссылок
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Разрешаем загрузку локальных файлов
  setupFileProtocol(mainWindow);
}

function createReaderWindow() {
  if (readerWindow) {
    readerWindow.focus();
    return readerWindow;
  }

  // Создаем окно читалки без стандартного меню
  readerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    title: 'NoteGrab - Читалка',
    icon: path.join(__dirname, 'assets/icon.png'),
    // Убираем стандартное меню
    autoHideMenuBar: true,
    titleBarStyle: 'default'
  });

  // Убираем меню полностью
  readerWindow.setMenuBarVisibility(false);

  readerWindow.loadFile('book-reader.html');

  readerWindow.on('closed', () => {
    readerWindow = null;
  });

  readerWindow.once('ready-to-show', () => {
    readerWindow.center();
  });

  if (process.env.NODE_ENV === 'development') {
    readerWindow.webContents.openDevTools();
  }

  setupFileProtocol(readerWindow);

  return readerWindow;
}

function setupFileProtocol(window) {
  window.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders } });
  });

  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src * \'unsafe-inline\' \'unsafe-eval\' blob: data: file:']
      }
    });
  });
}

// ==================== IPC ОБРАБОТЧИКИ ДЛЯ РАБОТЫ С ФАЙЛАМИ ====================

// Чтение текстовых файлов
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    console.log('📖 Попытка чтения файла:', filePath);
    
    // Пробуем разные варианты путей
    const possiblePaths = [
      filePath,
      path.resolve(process.cwd(), filePath),
      path.resolve(__dirname, filePath),
      path.resolve(process.cwd(), 'books', path.basename(filePath)),
      path.resolve(__dirname, 'books', path.basename(filePath))
    ];
    
    let foundPath = null;
    for (const possiblePath of possiblePaths) {
      console.log('🔍 Проверяем путь:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        console.log('✅ Файл найден:', foundPath);
        break;
      }
    }
    
    if (!foundPath) {
      console.error('❌ Файл не найден ни по одному пути');
      return { success: false, error: 'File not found' };
    }
    
    const content = fs.readFileSync(foundPath, 'utf-8');
    return { success: true, content, path: foundPath };
    
  } catch (error) {
    console.error('❌ Ошибка чтения файла:', error);
    return { success: false, error: error.message };
  }
});

// Чтение бинарных файлов (для PDF)
ipcMain.handle('read-binary-file', async (event, filePath) => {
  try {
    console.log('📄 Чтение бинарного файла:', filePath);
    
    // Пробуем разные варианты путей
    const possiblePaths = [
      filePath,
      path.resolve(process.cwd(), filePath),
      path.resolve(__dirname, filePath),
      path.resolve(process.cwd(), 'books', path.basename(filePath)),
      path.resolve(__dirname, 'books', path.basename(filePath))
    ];
    
    let foundPath = null;
    for (const possiblePath of possiblePaths) {
      console.log('🔍 Проверяем путь:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        console.log('✅ Бинарный файл найден:', foundPath);
        break;
      }
    }
    
    if (!foundPath) {
      console.error('❌ Бинарный файл не найден ни по одному пути');
      return { success: false, error: 'Binary file not found' };
    }
    
    // Читаем как бинарные данные
    const data = fs.readFileSync(foundPath);
    
    // Конвертируем в строку для передачи
    const binaryString = data.toString('binary');
    
    console.log(`✅ Бинарный файл прочитан: ${data.length} байт`);
    return { 
      success: true, 
      content: binaryString, 
      path: foundPath,
      size: data.length 
    };
    
  } catch (error) {
    console.error('❌ Ошибка чтения бинарного файла:', error);
    return { success: false, error: error.message };
  }
});

// Проверка существования файла
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    console.log('🔍 Проверка существования файла:', filePath);
    
    const possiblePaths = [
      filePath,
      path.resolve(process.cwd(), filePath),
      path.resolve(__dirname, filePath),
      path.resolve(process.cwd(), 'books', path.basename(filePath)),
      path.resolve(__dirname, 'books', path.basename(filePath))
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        console.log('✅ Файл существует:', possiblePath);
        return true;
      }
    }
    
    console.log('❌ Файл не существует');
    return false;
    
  } catch (error) {
    console.error('❌ Ошибка проверки файла:', error);
    return false;
  }
});

// Получение абсолютного пути
ipcMain.handle('get-file-path', async (event, relativePath) => {
  try {
    console.log('📍 Получение абсолютного пути для:', relativePath);
    
    const possiblePaths = [
      relativePath,
      path.resolve(process.cwd(), relativePath),
      path.resolve(__dirname, relativePath),
      path.resolve(process.cwd(), 'books', path.basename(relativePath)),
      path.resolve(__dirname, 'books', path.basename(relativePath))
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        console.log('✅ Найден существующий путь:', possiblePath);
        return possiblePath;
      }
    }
    
    // Если файл не существует, возвращаем наиболее вероятный путь
    const mostLikelyPath = path.resolve(process.cwd(), relativePath);
    console.log('⚠️ Файл не существует, возвращаем вероятный путь:', mostLikelyPath);
    return mostLikelyPath;
    
  } catch (error) {
    console.error('❌ Ошибка получения пути:', error);
    return null;
  }
});

// Получение информации о файле
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    console.log('📊 Получение информации о файле:', filePath);
    
    const possiblePaths = [
      filePath,
      path.resolve(process.cwd(), filePath),
      path.resolve(__dirname, filePath),
      path.resolve(process.cwd(), 'books', path.basename(filePath)),
      path.resolve(__dirname, 'books', path.basename(filePath))
    ];
    
    let foundPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        break;
      }
    }
    
    if (!foundPath) {
      return { success: false, error: 'File not found' };
    }
    
    const stats = fs.statSync(foundPath);
    const fileExtension = path.extname(foundPath).toLowerCase();
    
    return {
      success: true,
      path: foundPath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: fileExtension,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
    };
    
  } catch (error) {
    console.error('❌ Ошибка получения информации о файле:', error);
    return { success: false, error: error.message };
  }
});

// Диалог выбора файла
ipcMain.handle('open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Books', extensions: ['pdf', 'epub', 'txt', 'fb2'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'EPUB', extensions: ['epub'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'FB2', extensions: ['fb2'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Сохранение файла
ipcMain.handle('save-file', async (event, content, defaultPath) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false, error: 'Save canceled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Обработчик для открытия читалки
ipcMain.handle('open-reader-window', async (event) => {
  console.log('📖 Открытие окна читалки');
  try {
    createReaderWindow();
    return { success: true };
  } catch (error) {
    console.error('❌ Ошибка создания окна читалки:', error);
    return { success: false, error: error.message };
  }
});

// Обработчик для закрытия читалки
ipcMain.handle('close-reader-window', async (event) => {
  console.log('📖 Закрытие окна читалки');
  if (readerWindow) {
    readerWindow.close();
    readerWindow = null;
  }
  return { success: true };
});

// Открытие файла в системном просмотрщике
ipcMain.handle('open-in-system-viewer', async (event, filePath) => {
  try {
    console.log('📂 Открытие файла в системном просмотрщике:', filePath);
    
    const possiblePaths = [
      filePath,
      path.resolve(process.cwd(), filePath),
      path.resolve(__dirname, filePath),
      path.resolve(process.cwd(), 'books', path.basename(filePath)),
      path.resolve(__dirname, 'books', path.basename(filePath))
    ];
    
    let foundPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        foundPath = possiblePath;
        break;
      }
    }
    
    if (!foundPath) {
      return { success: false, error: 'File not found for system viewer' };
    }
    
    await shell.openPath(foundPath);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Ошибка открытия файла в системном просмотрщике:', error);
    return { success: false, error: error.message };
  }
});

// Получение списка файлов в директории
ipcMain.handle('get-directory-files', async (event, directoryPath) => {
  try {
    const fullPath = path.resolve(process.cwd(), directoryPath);
    
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'Directory not found' };
    }
    
    const files = fs.readdirSync(fullPath);
    const bookFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.epub', '.txt', '.fb2'].includes(ext);
    });
    
    return { success: true, files: bookFiles };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== ОБРАБОТКА ПРОТОКОЛОВ И БЕЗОПАСНОСТЬ ====================

// Обработка протокола file://
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.protocol === 'file:') {
      return;
    }
    
    event.preventDefault();
  });
});

// Блокируем новые окна
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================

app.whenReady().then(() => {
  console.log('🚀 NoteGrab приложение запускается...');
  createMainWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Выход из приложения
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный Promise:', reason);
});

console.log('✅ Main process инициализирован');