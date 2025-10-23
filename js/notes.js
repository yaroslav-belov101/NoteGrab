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

// Стили для темной темы заметок
const notesStyles = `
/* Основные стили заметок в темной теме */
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
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #334155;
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 14px;
    white-space: nowrap;
    transition: all 0.3s ease;
    outline: none;
}

.search-box-note input::placeholder {
    color: #64748b;
}

.search-box-note input:focus {
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.08);
}

.add-note-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
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
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.note-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 20px;
}

.note-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid #334155;
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
    background: rgba(30, 41, 59, 0.9);
    border-color: #475569;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #334155;
}

.note-title {
    margin: 0;
    font-size: 1.3em;
    font-weight: 600;
    color: #f1f5f9;
    flex: 1;
    margin-right: 15px;
    word-break: break-word;
    line-height: 1.4;
}

.note-date {
    font-size: 0.8em;
    color: #94a3b8;
    white-space: nowrap;
    flex-shrink: 0;
    background: rgba(148, 163, 184, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
}

.note-content {
    color: #cbd5e1;
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
    background: linear-gradient(transparent, rgba(30, 41, 59, 0.9));
}

.note-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 15px;
}

.btn-edit, .btn-delete {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.85em;
    color: #d1d5db;
    display: flex;
    align-items: center;
    gap: 6px;
    outline: none;
}

.btn-edit:hover {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
    transform: translateY(-1px);
}

.btn-delete:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: white;
    transform: translateY(-1px);
}

.btn-icon {
    font-size: 1em;
}

.btn-text {
    font-weight: 500;
}

/* Модальные окна */
.notes-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
}

.notes-modal {
    background: #1e293b;
    border-radius: 16px;
    padding: 0;
    width: 600px;
    max-width: 90vw;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    z-index: 10001;
    overflow: hidden;
    border: 1px solid #334155;
}

.notes-modal-header {
    padding: 20px 25px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
}

.notes-modal-title {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.3em;
    font-weight: 600;
}

.notes-modal-close {
    background: rgba(239, 68, 68, 0.1);
    border: none;
    color: #ef4444;
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
    background: rgba(239, 68, 68, 0.2);
}

.notes-modal-body {
    padding: 25px;
    background: transparent;
}

.notes-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.notes-form-group {
    display: flex;
    flex-direction: column;
}

.notes-form-label {
    margin-bottom: 8px;
    color: #e2e8f0;
    font-weight: 500;
    font-size: 14px;
}

.notes-form-input, .notes-form-textarea {
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #374151;
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 14px;
    box-sizing: border-box;
    width: 100%;
    font-family: inherit;
    transition: all 0.3s ease;
    outline: none;
    resize: vertical;
}

.notes-form-input:focus, .notes-form-textarea:focus {
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.08);
}

.notes-form-input::placeholder, .notes-form-textarea::placeholder {
    color: #64748b;
}

.notes-form-textarea {
    min-height: 120px;
    line-height: 1.5;
}

.notes-form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #334155;
}

.notes-btn-cancel {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.08);
    color: #d1d5db;
    border: 1px solid #374151;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    transition: all 0.3s ease;
    outline: none;
}

.notes-btn-cancel:hover {
    background: rgba(255, 255, 255, 0.12);
}

.notes-btn-save {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.3s ease;
    outline: none;
}

.notes-btn-save:hover {
    background: #5a67d8;
    transform: translateY(-1px);
}

/* Окно просмотра заметки */
.note-view-backdrop {
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
    padding: 20px;
    box-sizing: border-box;
    backdrop-filter: blur(12px);
}

.note-view-modal {
    background: #1e293b;
    border-radius: 16px;
    padding: 0;
    width: 90vw;
    height: 90vh;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #334155;
}

.note-view-header {
    padding: 25px 30px;
    border-bottom: 1px solid #334155;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.note-view-title {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.8em;
    font-weight: 600;
    flex: 1;
    padding-right: 20px;
    word-wrap: break-word;
    line-height: 1.3;
}

.note-view-close {
    background: rgba(239, 68, 68, 0.1);
    border: none;
    color: #ef4444;
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
    background: rgba(239, 68, 68, 0.2);
}

.note-view-content {
    flex: 1;
    padding: 30px;
    background: transparent;
    color: #e2e8f0;
    font-size: 16px;
    line-height: 1.7;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.note-view-footer {
    padding: 20px 30px;
    border-top: 1px solid #334155;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #94a3b8;
    font-size: 13px;
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
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-edit:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

.note-btn-delete {
    padding: 8px 16px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-delete:hover {
    background: #dc2626;
    transform: translateY(-1px);
}

.note-btn-save {
    padding: 8px 16px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-save:hover {
    background: #059669;
    transform: translateY(-1px);
}

.note-btn-cancel {
    padding: 8px 16px;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
    outline: none;
}

.note-btn-cancel:hover {
    background: #4b5563;
    transform: translateY(-1px);
}

/* Поля ввода для редактирования */
.note-edit-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #667eea;
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 1.8em;
    font-weight: 600;
    padding: 12px 16px;
    width: 100%;
    font-family: inherit;
    outline: none;
}

.note-edit-textarea {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #667eea;
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 16px;
    line-height: 1.7;
    padding: 20px;
    width: calc(100% - 60px);
    margin: 20px 30px;
    min-height: 300px;
    resize: vertical;
    font-family: inherit;
    outline: none;
}

/* Состояние пустого списка заметок */
.notes-empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    border: 1px dashed #334155;
}

.notes-empty-icon {
    font-size: 3em;
    margin-bottom: 15px;
    opacity: 0.5;
}

.notes-empty-state h3 {
    margin-bottom: 10px;
    color: #e2e8f0;
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
    }
    
    .note-view-header {
        padding: 20px;
    }
    
    .note-view-content {
        padding: 20px;
    }
    
    .note-view-footer {
        padding: 15px 20px;
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
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