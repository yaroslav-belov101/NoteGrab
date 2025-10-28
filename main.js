const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

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

// ==================== УТИЛИТЫ ДЛЯ РАБОТЫ С ФАЙЛАМИ ====================

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📁 Создаем директорию:', dirPath);
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

function fileExistsSync(filePath) {
  try {
    require('fs').accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function findExistingFilePath(filePath) {
  const fsSync = require('fs');
  const possiblePaths = [
    filePath,
    path.resolve(process.cwd(), filePath),
    path.resolve(__dirname, filePath),
    path.resolve(process.cwd(), 'books', path.basename(filePath)),
    path.resolve(__dirname, 'books', path.basename(filePath))
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fsSync.existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  return null;
}

// ==================== IPC ОБРАБОТЧИКИ ДЛЯ РАБОТЫ С ФАЙЛАМИ ====================

// Универсальный обработчик для чтения файлов (включая planner.json)
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    console.log('📖 Попытка чтения файла:', filePath);
    
    // Для planner.json создаем директорию и файл если нужно
    if (filePath.includes('planner.json')) {
      const fullPath = path.join(__dirname, filePath);
      await ensureDirectoryExists(path.dirname(fullPath));
      
      try {
        const data = await fs.readFile(fullPath, 'utf-8');
        console.log('✅ Planner.json загружен');
        return data;
      } catch (error) {
        if (error.code === 'ENOENT') {
          const initialData = {
            tasks: [],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          await fs.writeFile(fullPath, JSON.stringify(initialData, null, 2));
          console.log('✅ Planner.json создан с начальными данными');
          return JSON.stringify(initialData);
        }
        throw error;
      }
    }
    
    // Для остальных файлов используем старую логику
    const foundPath = findExistingFilePath(filePath);
    
    if (!foundPath) {
      console.error('❌ Файл не найден ни по одному пути');
      return JSON.stringify({ success: false, error: 'File not found' });
    }
    
    const content = await fs.readFile(foundPath, 'utf-8');
    console.log('✅ Файл прочитан:', foundPath);
    return content;
    
  } catch (error) {
    console.error('❌ Ошибка чтения файла:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Универсальный обработчик для записи файлов (включая planner.json)
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    console.log('💾 Попытка записи файла:', filePath);
    
    const fullPath = path.join(__dirname, filePath);
    await ensureDirectoryExists(path.dirname(fullPath));
    
    await fs.writeFile(fullPath, data, 'utf-8');
    console.log('✅ Файл успешно записан:', fullPath);
    
    return JSON.stringify({ success: true });
    
  } catch (error) {
    console.error('❌ Ошибка записи файла:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Чтение бинарных файлов (для PDF)
ipcMain.handle('read-binary-file', async (event, filePath) => {
  try {
    console.log('📄 Чтение бинарного файла:', filePath);
    
    const foundPath = findExistingFilePath(filePath);
    
    if (!foundPath) {
      console.error('❌ Бинарный файл не найден ни по одному пути');
      return JSON.stringify({ success: false, error: 'Binary file not found' });
    }
    
    // Читаем как бинарные данные
    const data = await fs.readFile(foundPath);
    
    // Конвертируем в строку для передачи
    const binaryString = data.toString('binary');
    
    console.log(`✅ Бинарный файл прочитан: ${data.length} байт`);
    return JSON.stringify({ 
      success: true, 
      content: binaryString, 
      path: foundPath,
      size: data.length 
    });
    
  } catch (error) {
    console.error('❌ Ошибка чтения бинарного файла:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Проверка существования файла
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    console.log('🔍 Проверка существования файла:', filePath);
    
    const foundPath = findExistingFilePath(filePath);
    const exists = foundPath !== null;
    
    console.log(exists ? '✅ Файл существует' : '❌ Файл не существует');
    return exists;
    
  } catch (error) {
    console.error('❌ Ошибка проверки файла:', error);
    return false;
  }
});

// Получение абсолютного пути
ipcMain.handle('get-file-path', async (event, relativePath) => {
  try {
    console.log('📍 Получение абсолютного пути для:', relativePath);
    
    const foundPath = findExistingFilePath(relativePath);
    
    if (foundPath) {
      console.log('✅ Найден существующий путь:', foundPath);
      return foundPath;
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
    
    const foundPath = findExistingFilePath(filePath);
    
    if (!foundPath) {
      return JSON.stringify({ success: false, error: 'File not found' });
    }
    
    const fsSync = require('fs');
    const stats = fsSync.statSync(foundPath);
    const fileExtension = path.extname(foundPath).toLowerCase();
    
    const fileInfo = {
      success: true,
      path: foundPath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: fileExtension,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
    };
    
    return JSON.stringify(fileInfo);
    
  } catch (error) {
    console.error('❌ Ошибка получения информации о файле:', error);
    return JSON.stringify({ success: false, error: error.message });
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
      await fs.writeFile(result.filePath, content, 'utf-8');
      return JSON.stringify({ success: true, path: result.filePath });
    }
    return JSON.stringify({ success: false, error: 'Save canceled' });
  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Обработчик для открытия читалки
ipcMain.handle('open-reader-window', async (event) => {
  console.log('📖 Открытие окна читалки');
  try {
    createReaderWindow();
    return JSON.stringify({ success: true });
  } catch (error) {
    console.error('❌ Ошибка создания окна читалки:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Обработчик для закрытия читалки
ipcMain.handle('close-reader-window', async (event) => {
  console.log('📖 Закрытие окна читалки');
  if (readerWindow) {
    readerWindow.close();
    readerWindow = null;
  }
  return JSON.stringify({ success: true });
});

// Открытие файла в системном просмотрщике
ipcMain.handle('open-in-system-viewer', async (event, filePath) => {
  try {
    console.log('📂 Открытие файла в системном просмотрщике:', filePath);
    
    const foundPath = findExistingFilePath(filePath);
    
    if (!foundPath) {
      return JSON.stringify({ success: false, error: 'File not found for system viewer' });
    }
    
    await shell.openPath(foundPath);
    return JSON.stringify({ success: true });
    
  } catch (error) {
    console.error('❌ Ошибка открытия файла в системном просмотрщике:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Получение списка файлов в директории
ipcMain.handle('get-directory-files', async (event, directoryPath) => {
  try {
    const fullPath = path.resolve(process.cwd(), directoryPath);
    
    if (!fileExistsSync(fullPath)) {
      return JSON.stringify({ success: false, error: 'Directory not found' });
    }
    
    const fsSync = require('fs');
    const files = fsSync.readdirSync(fullPath);
    const bookFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.epub', '.txt', '.fb2'].includes(ext);
    });
    
    return JSON.stringify({ success: true, files: bookFiles });
    
  } catch (error) {
    return JSON.stringify({ success: false, error: error.message });
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

// ==================== УПРАВЛЕНИЕ ТЕМОЙ И СОСТОЯНИЕМ ====================

// Глобальное хранилище состояния
const appState = {
  theme: 'theme-dark',
  sidebarPinned: true
};

// Загрузка состояния при запуске
ipcMain.handle('load-app-state', async (event) => {
  try {
    const statePath = path.join(__dirname, 'app-state.json');
    if (fileExistsSync(statePath)) {
      const data = await fs.readFile(statePath, 'utf-8');
      const savedState = JSON.parse(data);
      Object.assign(appState, savedState);
    }
    return JSON.stringify(appState);
  } catch (error) {
    console.log('❌ Ошибка загрузки состояния, используем значения по умолчанию');
    return JSON.stringify(appState);
  }
});

// Сохранение состояния
ipcMain.handle('save-app-state', async (event, newState) => {
  try {
    Object.assign(appState, newState);
    const statePath = path.join(__dirname, 'app-state.json');
    await fs.writeFile(statePath, JSON.stringify(appState, null, 2));
    
    // Рассылаем обновление всем окнам
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('app-state-updated', appState);
      }
    });
    
    return JSON.stringify({ success: true });
  } catch (error) {
    console.error('❌ Ошибка сохранения состояния:', error);
    return JSON.stringify({ success: false, error: error.message });
  }
});

// Рассылка обновлений состояния всем окнам
function broadcastAppState() {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    if (win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('app-state-updated', appState);
    }
  });
}

// Обработчик для получения текущего состояния
ipcMain.handle('get-app-state', async (event) => {
  return JSON.stringify(appState);
});