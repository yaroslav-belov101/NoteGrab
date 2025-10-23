const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Экспортируем безопасные версии API в renderer процесс
contextBridge.exposeInMainWorld('electronAPI', {
    // Файловые операции
    readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
    writeFile: (filePath, data) => fs.writeFileSync(filePath, data),
    exists: (filePath) => fs.existsSync(filePath),
    mkdir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
    
    // Пути
    joinPath: (...paths) => path.join(...paths),
    dirname: (filePath) => path.dirname(filePath),
    
    // IPC коммуникация
    sayHello: () => ipcRenderer.send('say-hello')
});