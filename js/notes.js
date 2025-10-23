const fs = require('fs');
const path = require('path');
const os = require('os');

class NotesManager {
    constructor() {
        this.notes = [];
        this.currentNoteId = null;
        this.isEditing = false;
        this.isViewEditing = false;
        
        this.notesFilePath = path.join(os.homedir(), 'NoteGrab', 'data_note', 'notes.json');
        
        this.init();
    }

    init() {
        this.ensureDataDirectory();
        this.loadNotes();
        this.setupEventListeners();
        this.renderNotes();
    }

    ensureDataDirectory() {
        try {
            const dataDir = path.dirname(this.notesFilePath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    loadNotes() {
        try {
            if (fs.existsSync(this.notesFilePath)) {
                const data = fs.readFileSync(this.notesFilePath, 'utf8');
                this.notes = JSON.parse(data);
            } else {
                this.notes = [];
                this.saveNotes();
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
        }
    }

    saveNotes() {
        try {
            fs.writeFileSync(this.notesFilePath, JSON.stringify(this.notes, null, 2));
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }

    setupEventListeners() {
        const addButton = document.getElementById('add-note-btn');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.openNoteModal();
            });
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchNotes(e.target.value);
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isViewEditing) {
                    this.cancelViewEdit();
                } else {
                    this.closeNoteModal();
                }
            }
        });
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    openNoteModal(note = null) {
        this.closeNoteModal();
        this.isEditing = !!note;
        this.currentNoteId = note ? note.id : null;

        const backdrop = document.createElement('div');
        backdrop.id = 'notes-modal-backdrop';
        backdrop.className = 'notes-modal-backdrop';

        const modal = document.createElement('div');
        modal.className = 'notes-modal';

        const header = document.createElement('div');
        header.className = 'notes-modal-header';

        const title = document.createElement('h3');
        title.textContent = this.isEditing ? 'Редактировать заметку' : 'Новая заметка';
        title.className = 'notes-modal-title';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'notes-modal-close';

        const body = document.createElement('div');
        body.className = 'notes-modal-body';

        const form = document.createElement('form');
        form.className = 'notes-form';

        const titleGroup = document.createElement('div');
        titleGroup.className = 'notes-form-group';
        
        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Заголовок';
        titleLabel.className = 'notes-form-label';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = 'note-title';
        titleInput.placeholder = 'Введите заголовок заметки...';
        titleInput.value = note ? note.title : '';
        titleInput.required = true;
        titleInput.className = 'notes-form-input';

        const contentGroup = document.createElement('div');
        contentGroup.className = 'notes-form-group';
        
        const contentLabel = document.createElement('label');
        contentLabel.textContent = 'Содержание';
        contentLabel.className = 'notes-form-label';

        const contentInput = document.createElement('textarea');
        contentInput.id = 'note-content';
        contentInput.placeholder = 'Начните писать ваши мысли здесь...';
        contentInput.value = note ? note.content : '';
        contentInput.required = true;
        contentInput.rows = 8;
        contentInput.className = 'notes-form-textarea';

        const actions = document.createElement('div');
        actions.className = 'notes-form-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.className = 'notes-btn-cancel';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.textContent = this.isEditing ? 'Сохранить изменения' : 'Создать заметку';
        saveBtn.className = 'notes-btn-save';

        titleGroup.appendChild(titleLabel);
        titleGroup.appendChild(titleInput);
        
        contentGroup.appendChild(contentLabel);
        contentGroup.appendChild(contentInput);
        
        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        
        form.appendChild(titleGroup);
        form.appendChild(contentGroup);
        form.appendChild(actions);
        
        body.appendChild(form);
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        modal.appendChild(header);
        modal.appendChild(body);
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        closeBtn.addEventListener('click', () => this.closeNoteModal());
        cancelBtn.addEventListener('click', () => this.closeNoteModal());
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
        });
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeNoteModal();
            }
        });

        titleInput.focus();
    }

    closeNoteModal() {
        const modal = document.getElementById('notes-modal-backdrop');
        if (modal) {
            modal.remove();
        }
        this.isEditing = false;
        this.currentNoteId = null;
    }

    saveNote() {
        const titleInput = document.getElementById('note-title');
        const contentInput = document.getElementById('note-content');

        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title) {
            alert('Введите заголовок заметки');
            titleInput.focus();
            return;
        }

        const noteData = {
            id: this.isEditing ? this.currentNoteId : this.generateId(),
            title: title,
            content: content,
            createdAt: this.isEditing ? 
                this.notes.find(note => note.id === this.currentNoteId)?.createdAt || new Date().toISOString() : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.isEditing) {
            const index = this.notes.findIndex(note => note.id === this.currentNoteId);
            if (index !== -1) {
                this.notes[index] = noteData;
            }
        } else {
            this.notes.unshift(noteData);
        }

        this.saveNotes();
        this.renderNotes();
        this.closeNoteModal();
    }

    editNote(id) {
        const note = this.notes.find(note => note.id === id);
        if (note) {
            this.openNoteModal(note);
        }
    }

    deleteNote(id) {
        if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
            this.notes = this.notes.filter(note => note.id !== id);
            this.saveNotes();
            this.renderNotes();
        }
    }

    openNoteView(id) {
        const note = this.notes.find(note => note.id === id);
        if (note) {
            this.openNoteViewModal(note);
        }
    }

    openNoteViewModal(note) {
        const backdrop = document.createElement('div');
        backdrop.id = 'note-view-backdrop';
        backdrop.className = 'note-view-backdrop';

        const modal = document.createElement('div');
        modal.className = 'note-view-modal';

        const header = document.createElement('div');
        header.className = 'note-view-header';

        let titleElement;
        if (this.isViewEditing) {
            titleElement = document.createElement('input');
            titleElement.type = 'text';
            titleElement.value = note.title;
            titleElement.className = 'note-edit-input';
        } else {
            titleElement = document.createElement('h1');
            titleElement.textContent = note.title;
            titleElement.className = 'note-view-title';
        }

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.className = 'note-view-close';

        let contentElement;
        if (this.isViewEditing) {
            contentElement = document.createElement('textarea');
            contentElement.value = note.content;
            contentElement.className = 'note-edit-textarea';
        } else {
            contentElement = document.createElement('div');
            contentElement.textContent = note.content;
            contentElement.className = 'note-view-content';
        }

        const footer = document.createElement('div');
        footer.className = 'note-view-footer';

        const dateInfo = document.createElement('div');
        dateInfo.className = 'note-view-dates';
        dateInfo.innerHTML = `
            <div>📅 Создано: ${new Date(note.createdAt).toLocaleString('ru-RU')}</div>
            <div>✏️ Обновлено: ${new Date(note.updatedAt).toLocaleString('ru-RU')}</div>
        `;

        const actions = document.createElement('div');
        actions.className = 'note-view-actions';

        let editBtn, deleteBtn, saveBtn, cancelBtn;

        if (this.isViewEditing) {
            saveBtn = document.createElement('button');
            saveBtn.textContent = '💾 Сохранить';
            saveBtn.className = 'note-btn-save';

            cancelBtn = document.createElement('button');
            cancelBtn.textContent = '❌ Отмена';
            cancelBtn.className = 'note-btn-cancel';

            actions.appendChild(saveBtn);
            actions.appendChild(cancelBtn);
        } else {
            editBtn = document.createElement('button');
            editBtn.textContent = '✏️ Редактировать';
            editBtn.className = 'note-btn-edit';

            deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️ Удалить';
            deleteBtn.className = 'note-btn-delete';

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
        }

        header.appendChild(titleElement);
        header.appendChild(closeBtn);
        
        footer.appendChild(dateInfo);
        footer.appendChild(actions);
        
        modal.appendChild(header);
        modal.appendChild(contentElement);
        modal.appendChild(footer);
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        if (this.isViewEditing) {
            saveBtn.addEventListener('click', () => {
                this.saveViewEdit(note.id, titleElement.value, contentElement.value);
            });

            cancelBtn.addEventListener('click', () => {
                this.cancelViewEdit();
            });

            titleElement.focus();
            titleElement.select();
        } else {
            editBtn.addEventListener('click', () => {
                this.startViewEdit(note.id);
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
                    this.closeNoteViewModal();
                    this.deleteNote(note.id);
                }
            });
        }

        closeBtn.addEventListener('click', () => this.closeNoteViewModal());
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeNoteViewModal();
            }
        });
    }

    startViewEdit(noteId) {
        this.isViewEditing = true;
        this.currentNoteId = noteId;
        this.closeNoteViewModal();
        const note = this.notes.find(note => note.id === noteId);
        if (note) {
            this.openNoteViewModal(note);
        }
    }

    saveViewEdit(noteId, newTitle, newContent) {
        const title = newTitle.trim();
        const content = newContent.trim();

        if (!title) {
            alert('Заголовок не может быть пустым');
            return;
        }

        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            this.notes[noteIndex].title = title;
            this.notes[noteIndex].content = content;
            this.notes[noteIndex].updatedAt = new Date().toISOString();
            
            this.saveNotes();
            this.renderNotes();
        }

        this.isViewEditing = false;
        this.closeNoteViewModal();
        
        const note = this.notes.find(note => note.id === noteId);
        if (note) {
            this.openNoteViewModal(note);
        }
    }

    cancelViewEdit() {
        this.isViewEditing = false;
        this.closeNoteViewModal();
        
        const note = this.notes.find(note => note.id === this.currentNoteId);
        if (note) {
            this.openNoteViewModal(note);
        }
    }

    closeNoteViewModal() {
        const modal = document.getElementById('note-view-backdrop');
        if (modal) {
            modal.remove();
        }
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Сегодня';
            if (diffDays === 1) return 'Вчера';
            if (diffDays < 7) return `${diffDays} дня назад`;
            
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return 'Дата неизвестна';
        }
    }

    searchNotes(query) {
        const notesContainer = document.getElementById('notes-container');
        if (!notesContainer) return;

        const noteCards = notesContainer.querySelectorAll('.note-card');
        const searchTerm = query.toLowerCase().trim();
        
        noteCards.forEach(card => {
            const title = card.querySelector('.note-title').textContent.toLowerCase();
            const content = card.querySelector('.note-content').textContent.toLowerCase();
            
            if (!searchTerm || title.includes(searchTerm) || content.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    renderNotes() {
        const notesContainer = document.getElementById('notes-container');
        if (!notesContainer) return;

        if (this.notes.length === 0) {
            notesContainer.innerHTML = `
                <div class="notes-empty-state">
                    <div class="notes-empty-icon">📝</div>
                    <h3>Пока нет заметок</h3>
                    <p>Создайте свою первую заметку, нажав на кнопку выше</p>
                </div>
            `;
            return;
        }

        notesContainer.innerHTML = this.notes.map(note => `
            <div class="note-card" onclick="notesManager.openNoteView('${note.id}')">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                    <span class="note-date">${this.formatDate(note.updatedAt)}</span>
                </div>
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                <div class="note-actions">
                    <button class="btn-edit" onclick="event.stopPropagation(); notesManager.editNote('${note.id}')">
                        <span class="btn-icon">✏️</span>
                        <span class="btn-text">Редактировать</span>
                    </button>
                    <button class="btn-delete" onclick="event.stopPropagation(); notesManager.deleteNote('${note.id}')">
                        <span class="btn-icon">🗑️</span>
                        <span class="btn-text">Удалить</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Обновленные стили для темной темы с черными оттенками
const notesStyles = `
/* Основные стили заметок в черной теме */
.notes-container {
    width: 90%;
    margin-bottom: 10px;
    border-radius: 10px;
    padding: 0px;
    margin-left: 25px;
}

.search-box-note {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
    margin-bottom: 20px;
}

.search-box-note input {
    flex: 1;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    white-space: nowrap;
    transition: all 0.3s ease;
    outline: none;
}

.search-box-note input::placeholder {
    color: #888;
}

.search-box-note input:focus {
    border-color: #555;
    background: rgba(0, 0, 0, 0.4);
}

.add-note-button {
    background: linear-gradient(135deg, #222 0%, #000 100%);
    color: white;
    border: 1px solid #333;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 160px;
    outline: none;
}

.add-note-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.6);
    border-color: #555;
}

.note-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 20px;
}

.note-card {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #222;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
    backdrop-filter: blur(10px);
    outline: none;
}

.note-card:hover {
    background: rgba(0, 0, 0, 0.6);
    border-color: #333;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #222;
}

.note-title {
    margin: 0;
    font-size: 1.3em;
    font-weight: 600;
    color: #fff;
    flex: 1;
    margin-right: 15px;
    word-break: break-word;
    line-height: 1.4;
}

.note-date {
    font-size: 0.8em;
    color: #888;
    white-space: nowrap;
    flex-shrink: 0;
    background: rgba(136, 136, 136, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
}

.note-content {
    color: #ccc;
    line-height: 1.6;
    margin-bottom: 15px;
    max-height: 100px;
    overflow: hidden;
    position: relative;
    word-break: break-word;
    white-space: pre-wrap;
    font-size: 0.9em;
}

.note-content:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

.note-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 15px;
}

.btn-edit, .btn-delete {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #222;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.85em;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 6px;
    outline: none;
}

.btn-edit:hover {
    background: #333;
    border-color: #444;
    color: white;
    transform: translateY(-1px);
}

.btn-delete:hover {
    background: #300;
    border-color: #500;
    color: white;
    transform: translateY(-1px);
}

.btn-icon {
    font-size: 1em;
}

.btn-text {
    font-weight: 500;
}

/* Модальные окна - черная тема */
.notes-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
}

.notes-modal {
    background: #000;
    border-radius: 12px;
    padding: 0;
    width: 700px;
    max-width: 85vw;
    max-height: 85vh;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
    z-index: 10001;
    overflow: hidden;
    border: 2px solid #222;
    display: flex;
    flex-direction: column;
}

.notes-modal-header {
    padding: 20px 25px;
    border-bottom: 1px solid #222;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(20, 20, 20, 0.8);
}

.notes-modal-title {
    margin: 0;
    color: #fff;
    font-size: 1.3em;
    font-weight: 600;
}

.notes-modal-close {
    background: rgba(80, 0, 0, 0.3);
    border: 1px solid #300;
    color: #f55;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.3s ease;
    outline: none;
}

.notes-modal-close:hover {
    background: rgba(100, 0, 0, 0.5);
    border-color: #500;
}

.notes-modal-body {
    padding: 25px;
    background: transparent;
    flex: 1;
    overflow-y: auto;
}

.notes-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
}

.notes-form-group {
    display: flex;
    flex-direction: column;
}

.notes-form-label {
    margin-bottom: 8px;
    color: #ddd;
    font-weight: 500;
    font-size: 14px;
}

.notes-form-input, .notes-form-textarea {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #222;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    box-sizing: border-box;
    width: 100%;
    font-family: inherit;
    transition: all 0.3s ease;
    outline: none;
    resize: vertical;
}

.notes-form-input:focus, .notes-form-textarea:focus {
    border-color: #444;
    background: rgba(0, 0, 0, 0.6);
}

.notes-form-input::placeholder, .notes-form-textarea::placeholder {
    color: #666;
}

.notes-form-textarea {
    min-height: 200px;
    line-height: 1.5;
    flex: 1;
}

.notes-form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #222;
}

.notes-btn-cancel {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.05);
    color: #ccc;
    border: 1px solid #222;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.3s ease;
    outline: none;
}

.notes-btn-cancel:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #333;
}

.notes-btn-save {
    padding: 10px 20px;
    background: #222;
    color: white;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    outline: none;
}

.notes-btn-save:hover {
    background: #333;
    border-color: #444;
    transform: translateY(-1px);
}

/* Окно просмотра заметки - черная тема */
.note-view-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
    backdrop-filter: blur(12px);
}

.note-view-modal {
    background: #000;
    border-radius: 12px;
    padding: 0;
    width: 95vw;
    height: 95vh;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid #222;
}

.note-view-header {
    padding: 25px 30px;
    border-bottom: 1px solid #222;
    background: rgba(20, 20, 20, 0.8);
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 80px;
}

.note-view-title {
    margin: 0;
    color: #fff;
    font-size: 2em;
    font-weight: 600;
    flex: 1;
    padding-right: 20px;
    word-wrap: break-word;
    line-height: 1.3;
}

.note-view-close {
    background: rgba(80, 0, 0, 0.3);
    border: 1px solid #300;
    color: #f55;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 8px;
    transition: all 0.3s ease;
    outline: none;
}

.note-view-close:hover {
    background: rgba(100, 0, 0, 0.5);
    border-color: #500;
}

.note-view-content {
    flex: 1;
    padding: 30px;
    background: transparent;
    color: #ddd;
    font-size: 16px;
    line-height: 1.7;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    background: rgba(10, 10, 10, 0.5);
}

.note-view-footer {
    padding: 20px 30px;
    border-top: 1px solid #222;
    background: rgba(20, 20, 20, 0.8);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #888;
    font-size: 13px;
    min-height: 70px;
}

.note-view-dates {
    line-height: 1.5;
}

.note-view-dates div {
    margin-bottom: 2px;
}

.note-view-actions {
    display: flex;
    gap: 10px;
}

.note-btn-edit {
    padding: 8px 16px;
    background: #222;
    color: white;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-edit:hover {
    background: #333;
    border-color: #444;
    transform: translateY(-1px);
}

.note-btn-delete {
    padding: 8px 16px;
    background: #300;
    color: white;
    border: 1px solid #500;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-delete:hover {
    background: #500;
    border-color: #700;
    transform: translateY(-1px);
}

.note-btn-save {
    padding: 8px 16px;
    background: #030;
    color: white;
    border: 1px solid #050;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-save:hover {
    background: #050;
    border-color: #070;
    transform: translateY(-1px);
}

.note-btn-cancel {
    padding: 8px 16px;
    background: #222;
    color: white;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-cancel:hover {
    background: #333;
    border-color: #444;
    transform: translateY(-1px);
}

/* Поля ввода для редактирования */
.note-edit-input {
    background: rgba(0, 0, 0, 0.4);
    border: none;
    border-radius: 0px;
    color: #fff;
    font-size: 2em;
    font-weight: 600;
    padding: 15px 20px;
    width: 100%;
    font-family: inherit;
    outline: none;
    transition: all 0.3s ease;
}

.note-edit-input:focus {
    background: rgba(0, 0, 0, 0.6);
}

.note-edit-textarea {
    background: rgba(0, 0, 0, 0.4);
    border: none;
    border-radius: 8px;
    color: #ddd;
    font-size: 16px;
    line-height: 1.7;
    padding: 25px;
    width: calc(100% - 60px);
    margin: 20px 30px;
    min-height: 400px;
    resize: vertical;
    font-family: inherit;
    outline: none;
    transition: all 0.3s ease;
    flex: 1;
}

.note-edit-textarea:focus {
    background: rgba(0, 0, 0, 0.6);
}

/* Состояние пустого списка заметок */
.notes-empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #888;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    border: 2px dashed #222;
}

.notes-empty-icon {
    font-size: 3em;
    margin-bottom: 15px;
    opacity: 0.5;
}

.notes-empty-state h3 {
    margin-bottom: 10px;
    color: #ddd;
    font-size: 1.5em;
    font-weight: 600;
}

.notes-empty-state p {
    font-size: 1em;
    opacity: 0.8;
}

/* Анимации */
@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.notes-modal, .note-view-modal {
    animation: modalFadeIn 0.3s ease-out;
}

/* Адаптивность */
@media (max-width: 768px) {
    .notes-container {
        width: 100%;
        margin-left: 0;
        padding: 0 10px;
    }
    
    .search-box-note {
        flex-direction: column;
        gap: 12px;
    }
    
    .search-box-note input {
        width: 100%;
    }
    
    .add-note-button {
        width: 100%;
        min-width: auto;
    }
    
    .note-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .note-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .note-date {
        align-self: flex-start;
    }
    
    .note-actions {
        justify-content: stretch;
    }
    
    .btn-edit, .btn-delete {
        flex: 1;
        justify-content: center;
    }
    
    .note-card {
        padding: 16px;
    }
    
    .note-title {
        font-size: 1.1em;
    }
    
    .notes-modal {
        width: 95vw;
        margin: 10px;
        max-height: 90vh;
    }
    
    .note-view-title {
        font-size: 1.4em;
    }
    
    .notes-form-actions {
        flex-direction: column;
    }
    
    .note-edit-textarea {
        width: calc(100% - 40px);
        margin: 15px 20px;
        min-height: 300px;
    }
    
    .note-edit-input {
        font-size: 1.4em;
        padding: 12px 15px;
    }
    
    .note-view-header {
        padding: 20px;
        min-height: 60px;
    }
    
    .note-view-content {
        padding: 20px;
    }
    
    .note-view-footer {
        padding: 15px 20px;
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
        min-height: auto;
    }
    
    .note-view-actions {
        justify-content: center;
    }
}
`;

// Добавляем стили в документ
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = notesStyles;
    document.head.appendChild(style);
    
    window.notesManager = new NotesManager();
});