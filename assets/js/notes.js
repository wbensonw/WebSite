// 筆記管理類
class NotesManager {
    constructor() {
        this.notes = [];
        this.currentType = '全部';
        this.currentSort = 'date-desc';
        this.searchTerm = '';
        this.currentView = 'grid';
        this.itemsPerPage = 12;
        this.currentPage = 1;
        this.isLoading = false;
        this.selectedKeywords = new Set();
        this.activeNoteId = null;
    }

    // 初始化
    async initialize() {
        this.showLoading();
        try {
            await this.loadData();
            this.setupTypeFilter();
            this.setupEventListeners();
            this.setInitialState();
            this.render();
        } catch (error) {
            console.error('初始化筆記系統失敗:', error);
            this.showError('載入筆記失敗');
        } finally {
            this.hideLoading();
        }
    }

    // 載入數據
    async loadData() {
        const data = await loadJsonData('../assets/data/notes.json');
        if (!data) throw new Error('無法載入數據');
        this.notes = data.notes;
        return data.categories;
    }

    // 設置筆記類型過濾器
    async setupTypeFilter() {
        const categories = await this.loadData();
        const typeButtons = document.querySelector('.type-buttons');
        if (!typeButtons) return;

        // 添加類型按鈕
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'type-btn';
            button.dataset.type = category.name;
            button.innerHTML = `
                <i class="${category.icon}"></i>
                ${category.name}
            `;
            typeButtons.appendChild(button);
        });
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 類型按鈕點擊
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleTypeChange(btn);
            });
        });

        // 排序變更
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.handleSortChange(e.target.value);
        });

        // 視圖切換
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleViewChange(btn.dataset.view);
            });
        });

        // 搜索功能
        const searchBox = document.querySelector('.search-box');
        if (searchBox) {
            searchBox.addEventListener('input', debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }

        // 搜索清除按鈕
        document.querySelector('.search-clear')?.addEventListener('click', () => {
            this.clearSearch();
        });

        // 新建筆記按鈕
        document.querySelector('.new-note-btn')?.addEventListener('click', () => {
            this.openNoteModal();
        });

        // 筆記表單提交
        document.querySelector('.note-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNoteSubmit();
        });

        // 關鍵詞輸入
        const keywordsInput = document.getElementById('note-keywords');
        if (keywordsInput) {
            keywordsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addKeyword(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }

        // 模態框關閉按鈕
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // ESC關閉模態框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });

        // 圖片上傳
        document.querySelector('.upload-btn')?.addEventListener('click', () => {
            this.handleImageUpload();
        });

        // 快捷鍵
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // 設置初始狀態
    setInitialState() {
        // 恢復保存的視圖設置
        const savedView = localStorage.getItem('notesView') || 'grid';
        this.handleViewChange(savedView);

        // 重置分頁
        this.currentPage = 1;
    }

    // 處理類型變更
    handleTypeChange(button) {
        document.querySelectorAll('.type-btn').forEach(btn => 
            btn.classList.remove('active'));
        button.classList.add('active');
        this.currentType = button.dataset.type;
        this.currentPage = 1;
        this.render();
    }

    // 處理排序變更
    handleSortChange(sortValue) {
        this.currentSort = sortValue;
        this.currentPage = 1;
        this.render();
    }

    // 處理視圖變更
    handleViewChange(view) {
        this.currentView = view;
        localStorage.setItem('notesView', view);

        // 更新視圖按鈕狀態
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 更新容器視圖
        const container = document.querySelector('.notes-container');
        if (container) {
            container.dataset.view = view;
        }

        this.render();
    }

    // 處理搜索
    handleSearch(value) {
        this.searchTerm = value.toLowerCase();
        this.currentPage = 1;
        this.render();
    }

    // 清除搜索
    clearSearch() {
        const searchBox = document.querySelector('.search-box');
        if (searchBox) {
            searchBox.value = '';
            this.searchTerm = '';
            this.render();
        }
    }

    // 處理鍵盤快捷鍵
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + / : 聚焦搜索框
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            document.querySelector('.search-box')?.focus();
        }
        // Ctrl/Cmd + N : 新建筆記
        else if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.openNoteModal();
        }
    }

    // 過濾筆記
    filterNotes() {
        return this.notes.filter(note => {
            const matchesType = this.currentType === '全部' || 
                              note.type === this.currentType;
            const matchesSearch = !this.searchTerm || 
                                note.title.toLowerCase().includes(this.searchTerm) || 
                                note.content.text.toLowerCase().includes(this.searchTerm) || 
                                note.keywords.some(k => k.toLowerCase().includes(this.searchTerm));
            return matchesType && matchesSearch;
        });
    }

    // 排序筆記
    sortNotes(notes) {
        return [...notes].sort((a, b) => {
            switch(this.currentSort) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });
    }

    // 創建筆記卡片
    createNoteCard(note) {
        return `
            <div class="note-card" data-id="${note.id}">
                <div class="note-card-content">
                    <div class="note-header">
                        <span class="note-type">${note.type}</span>
                        <span class="note-date">${formatDate(note.date)}</span>
                    </div>
                    <h2 class="note-title">${note.title}</h2>
                    <div class="note-keywords">
                        ${note.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                    <div class="note-preview">
                        ${this.createPreviewContent(note)}
                    </div>
                </div>
                <div class="note-actions">
                    <button class="btn-edit" onclick="event.stopPropagation(); notesManager.editNote('${note.id}')">
                        <i class="ri-edit-line"></i>
                        編輯
                    </button>
                    <button class="btn-delete" onclick="event.stopPropagation(); notesManager.confirmDelete('${note.id}')">
                        <i class="ri-delete-bin-line"></i>
                        刪除
                    </button>
                </div>
            </div>
        `;
    }

    // 創建筆記列表項
    createNoteListItem(note) {
        return `
            <div class="note-list-item" data-id="${note.id}">
                <div class="note-meta">
                    <span class="note-type">${note.type}</span>
                    <span class="note-date">${formatDate(note.date)}</span>
                </div>
                <div class="note-content">
                    <h2 class="note-title">${note.title}</h2>
                    <div class="note-keywords">
                        ${note.keywords.map(keyword => 
                            `<span class="keyword">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="note-actions">
                    <button class="btn-edit" onclick="event.stopPropagation(); notesManager.editNote('${note.id}')">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn-delete" onclick="event.stopPropagation(); notesManager.confirmDelete('${note.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // 創建預覽內容
    createPreviewContent(note) {
        let preview = '';
        
        if (note.content.text) {
            preview += `<p class="preview-text">${note.content.text}</p>`;
        }
        
        if (note.content.images && note.content.images.length > 0) {
            preview += `
                <div class="preview-images">
                    ${note.content.images.slice(0, 2).map(img => `
                        <img src="../${img.url}" 
                             alt="${img.caption}"
                             onerror="handleImageError(this)">
                    `).join('')}
                    ${note.content.images.length > 2 ? 
                        `<div class="more-images">+${note.content.images.length - 2}</div>` : 
                        ''}
                </div>
            `;
        }
        
        return preview;
    }

    // 創建分頁控制
    createPagination() {
        const totalPages = Math.ceil(this.filteredNotes.length / this.itemsPerPage);
        if (totalPages <= 1) return '';

        let pagination = `
            <button class="page-btn" 
                    onclick="notesManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-double-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-line"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pagination += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}"
                            onclick="notesManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                pagination += `<span class="page-ellipsis">...</span>`;
            }
        }

        pagination += `
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-line"></i>
            </button>
            <button class="page-btn" 
                    onclick="notesManager.goToPage(${totalPages})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-double-line"></i>
            </button>
        `;

        return pagination;
    }

    // 渲染筆記列表
    render() {
        const container = document.querySelector('.notes-container');
        const paginationContainer = document.querySelector('.pagination');
        if (!container) return;

        // 過濾和排序筆記
        this.filteredNotes = this.sortNotes(this.filterNotes());

        // 計算分頁
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedNotes = this.filteredNotes.slice(startIndex, endIndex);

        // 渲染筆記
        if (this.filteredNotes.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-search-line"></i>
                    <p>沒有找到匹配的筆記</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = paginatedNotes
            .map(note => this.currentView === 'grid' ? 
                this.createNoteCard(note) : 
                this.createNoteListItem(note))
            .join('');

        // 渲染分頁
        if (paginationContainer) {
            paginationContainer.innerHTML = this.createPagination();
        }

        // 添加動畫效果
        requestAnimationFrame(() => {
            const items = container.children;
            Array.from(items).forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    // 頁面跳轉
    goToPage(page) {
        this.currentPage = page;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 打開筆記模態框
    openNoteModal(noteId = null) {
        const modal = document.querySelector('.note-modal');
        const form = modal.querySelector('.note-form');
        const title = modal.querySelector('.modal-title');

        this.activeNoteId = noteId;
        this.selectedKeywords.clear();

        if (noteId) {
            // 編輯模式
            const note = this.notes.find(n => n.id === noteId);
            if (!note) return;

            title.textContent = '編輯筆記';
            form.elements['note-title'].value = note.title;
            form.elements['note-type'].value = note.type;
            form.elements['note-content'].value = note.content.text;
            note.keywords.forEach(keyword => this.addKeyword(keyword));
            this.renderImagePreviews(note.content.images || []);
        } else {
            // 新建模式
            title.textContent = '新建筆記';
            form.reset();
            this.renderImagePreviews([]);
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // 關閉所有模態框
    closeModals() {
        document.querySelectorAll('.note-modal, .confirm-modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
        this.activeNoteId = null;
        this.selectedKeywords.clear();
    }

    // 添加關鍵詞
    addKeyword(keyword) {
        if (!keyword || this.selectedKeywords.has(keyword)) return;

        this.selectedKeywords.add(keyword);
        this.renderKeywords();
    }

    // 移除關鍵詞
    removeKeyword(keyword) {
        this.selectedKeywords.delete(keyword);
        this.renderKeywords();
    }

    // 渲染關鍵詞標籤
    renderKeywords() {
        const container = document.querySelector('.keywords-tags');
        if (!container) return;

        container.innerHTML = Array.from(this.selectedKeywords)
            .map(keyword => `
                <span class="keyword">
                    ${keyword}
                    <button onclick="notesManager.removeKeyword('${keyword}')">
                        <i class="ri-close-line"></i>
                    </button>
                </span>
            `).join('');
    }

    // 處理圖片上傳
    handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;

        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.processImages(files);
        };

        input.click();
    }

    // 處理圖片文件
    async processImages(files) {
        const preview = document.querySelector('.image-preview');
        if (!preview) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML += `
                    <div class="image-item">
                        <img src="${e.target.result}" alt="預覽圖片">
                        <button onclick="this.parentElement.remove()">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        }
    }

    // 渲染圖片預覽
    renderImagePreviews(images) {
        const preview = document.querySelector('.image-preview');
        if (!preview) return;

        preview.innerHTML = images.map(img => `
            <div class="image-item">
                <img src="../${img.url}" alt="${img.caption}">
                <button onclick="this.parentElement.remove()">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        `).join('');
    }

    // 處理筆記表單提交
    handleNoteSubmit() {
        const form = document.querySelector('.note-form');
        if (!form) return;

        const noteData = {
            title: form.elements['note-title'].value,
            type: form.elements['note-type'].value,
            keywords: Array.from(this.selectedKeywords),
            content: {
                text: form.elements['note-content'].value,
                images: this.getImageData()
            },
            date: new Date().toISOString()
        };

        if (this.activeNoteId) {
            this.updateNote(this.activeNoteId, noteData);
        } else {
            this.addNote(noteData);
        }

        this.closeModals();
        this.render();
    }

    // 獲取圖片數據
    getImageData() {
        const preview = document.querySelector('.image-preview');
        if (!preview) return [];

        return Array.from(preview.querySelectorAll('.image-item img'))
            .map((img, index) => ({
                url: img.src,
                caption: `圖片 ${index + 1}`
            }));
    }

    // 添加新筆記
    addNote(noteData) {
        const newNote = {
            id: generateUniqueId(),
            ...noteData
        };

        if (!this.validateNote(newNote)) {
            this.showError('無效的筆記數據');
            return false;
        }

        this.notes.unshift(newNote);
        this.showSuccess('筆記創建成功');
        return true;
    }

    // 更新筆記
    updateNote(id, updates) {
        const index = this.notes.findIndex(n => n.id === id);
        if (index === -1) {
            this.showError('找不到指定的筆記');
            return false;
        }

        this.notes[index] = { ...this.notes[index], ...updates };
        this.showSuccess('筆記更新成功');
        return true;
    }

    // 編輯筆記
    editNote(id) {
        this.openNoteModal(id);
    }

    // 確認刪除
    confirmDelete(id) {
        const modal = document.querySelector('.confirm-modal');
        if (!modal) return;

        const confirmBtn = modal.querySelector('[data-action="confirm"]');
        confirmBtn.onclick = () => this.deleteNote(id);

        modal.classList.add('active');
    }

    // 刪除筆記
    deleteNote(id) {
        const index = this.notes.findIndex(n => n.id === id);
        if (index === -1) {
            this.showError('找不到指定的筆記');
            return false;
        }

        this.notes.splice(index, 1);
        this.closeModals();
        this.render();
        this.showSuccess('筆記已刪除');
        return true;
    }

    // 驗證筆記數據
    validateNote(note) {
        const requiredFields = ['id', 'title', 'type', 'date', 'keywords', 'content'];
        return requiredFields.every(field => note[field]) && 
               Array.isArray(note.keywords) &&
               typeof note.content === 'object' &&
               typeof note.content.text === 'string';
    }

    // 顯示加載狀態
    showLoading() {
        this.isLoading = true;
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.classList.add('active');
        }
    }

    // 隱藏加載狀態
    hideLoading() {
        this.isLoading = false;
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.classList.remove('active');
        }
    }

    // 顯示成功信息
    showSuccess(message) {
        showNotification(message, 'success');
    }

    // 顯示錯誤信息
    showError(message) {
        showNotification(message, 'error');
    }
}

// 初始化筆記系統
const notesManager = new NotesManager();
document.addEventListener('DOMContentLoaded', () => {
    notesManager.initialize();
});