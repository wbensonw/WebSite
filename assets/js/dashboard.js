// 儀表板管理類
class DashboardManager {
    constructor() {
        this.widgets = [];
        this.currentCategory = '常用';
        this.searchTerm = '';
        this.currentView = 'grid';
        this.isLoading = false;
    }

    // 初始化儀表板
    async initialize() {
        this.showLoading();
        try {
            await this.loadData();
            this.setupEventListeners();
            this.setInitialState();
            this.render();
        } catch (error) {
            console.error('初始化儀表板失敗:', error);
            this.showError('載入儀表板失敗');
        } finally {
            this.hideLoading();
        }
    }

    // 載入數據
    async loadData() {
        const data = await loadJsonData('../assets/data/widgets.json');
        if (!data) throw new Error('無法載入數據');
        this.widgets = data.widgets;
        this.setupCategories(data.categories);
        return data.categories;
    }

    // 設置分類按鈕
    setupCategories(categories) {
        const filterContainer = document.querySelector('.category-filter');
        if (!filterContainer) return;

        filterContainer.innerHTML = categories.map(category => `
            <button class="category-btn" data-category="${category.name}">
                <i class="${category.icon}"></i>
                <span>${category.name}</span>
            </button>
        `).join('');

        // 設置初始活動分類
        const defaultBtn = filterContainer.querySelector(`[data-category="${this.currentCategory}"]`);
        if (defaultBtn) {
            defaultBtn.classList.add('active');
        }
    }

    // 設置事件監聽器
    setupEventListeners() {
        // 分類按鈕點擊事件
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleCategoryChange(btn);
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
        const searchClear = document.querySelector('.search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // 視圖切換按鈕
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleViewChange(btn.dataset.view);
            });
        });

        // 監聽鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 新增：鼠標懸停效果
        document.addEventListener('mouseover', (e) => {
            const widget = e.target.closest('.widget');
            if (widget) {
                this.handleWidgetHover(widget, true);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const widget = e.target.closest('.widget');
            if (widget) {
                this.handleWidgetHover(widget, false);
            }
        });
    }

    // 處理 Widget 懸停效果
    handleWidgetHover(widget, isHovering) {
        if (isHovering) {
            widget.style.transform = 'translateY(-4px)';
            widget.style.boxShadow = 'var(--shadow-lg)';
        } else {
            widget.style.transform = '';
            widget.style.boxShadow = '';
        }
    }

    // 設置初始狀態
    setInitialState() {
        // 恢復保存的視圖設置
        const savedView = localStorage.getItem('dashboardView') || 'grid';
        this.handleViewChange(savedView);
    }

    // 處理分類變更
    handleCategoryChange(button) {
        document.querySelectorAll('.category-btn').forEach(btn => 
            btn.classList.remove('active'));
        button.classList.add('active');
        this.currentCategory = button.dataset.category;
        this.render();

        // 保存當前分類
        localStorage.setItem('currentCategory', this.currentCategory);
    }

    // 處理搜索
    handleSearch(value) {
        this.searchTerm = value.toLowerCase();
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

    // 處理視圖切換
    handleViewChange(view) {
        this.currentView = view;
        localStorage.setItem('dashboardView', view);

        // 更新視圖按鈕狀態
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // 更新容器視圖
        const container = document.querySelector('.grid-container');
        if (container) {
            container.dataset.view = view;
        }

        this.render();
    }

    // 處理鍵盤快捷鍵
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + / : 聚焦搜索框
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            document.querySelector('.search-box')?.focus();
        }
        // Esc : 清除搜索
        else if (event.key === 'Escape') {
            this.clearSearch();
        }
    }

    // 過濾 widgets
    filterWidgets() {
        return this.widgets.filter(widget => {
            const matchesCategory = this.currentCategory === '全部' || 
                                  widget.categories.includes(this.currentCategory);
            const matchesSearch = !this.searchTerm || 
                                widget.title.toLowerCase().includes(this.searchTerm) || 
                                widget.description.toLowerCase().includes(this.searchTerm) || 
                                widget.categories.some(cat => 
                                    cat.toLowerCase().includes(this.searchTerm));
            return matchesCategory && matchesSearch;
        });
    }

    // 創建 widget 元素
    createWidgetElement(widget) {
        return `
            <div class="widget" 
                 data-categories="${widget.categories.join(',')}"
                 onclick="window.open('https://${widget.url}', '_blank')"
                 title="${widget.title}\n${widget.description}"
                 role="link"
                 tabindex="0">
                <div class="widget-header">
                    <div class="widget-icon" aria-hidden="true">
                        <i class="${widget.icon}"></i>
                    </div>
                    <h2 class="widget-title">${widget.title}</h2>
                </div>
                <div class="widget-content">
                    <p class="widget-description">${widget.description}</p>
                </div>
                <div class="widget-footer">
                    ${widget.url}
                </div>
            </div>
        `;
    }

    // 渲染儀表板
    render() {
        const container = document.querySelector('.grid-container');
        if (!container) return;

        const filteredWidgets = this.filterWidgets()
            .sort((a, b) => a.priority - b.priority);

        if (filteredWidgets.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="ri-search-line"></i>
                    <p>沒有找到匹配的結果</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredWidgets
            .map(widget => this.createWidgetElement(widget))
            .join('');

        // 添加動畫效果
        requestAnimationFrame(() => {
            container.querySelectorAll('.widget').forEach((widget, index) => {
                widget.style.opacity = '0';
                widget.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    widget.style.opacity = '1';
                    widget.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });

        // 更新標題
        this.updatePageTitle();
    }

    // 更新頁面標題
    updatePageTitle() {
        const titleElement = document.querySelector('.dashboard-title');
        if (titleElement) {
            titleElement.textContent = this.currentCategory === '全部' ? 
                '網頁儀表板' : 
                `${this.currentCategory}網站`;
        }
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

    // 顯示錯誤信息
    showError(message) {
        showNotification(message, 'error');
    }
}

// 初始化儀表板
const dashboardManager = new DashboardManager();
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager.initialize();
});