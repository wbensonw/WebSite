document.addEventListener('DOMContentLoaded', function() {
    // 獲取當前頁面的相對路徑
    const currentPath = window.location.pathname;
    let headerPath, footerPath;
    let prefix = '';

    // 根據當前頁面路徑設置相對路徑
    if (currentPath.includes('/entries/')) {
        // 筆記內容頁面
        headerPath = '../../shared/header.html';
        footerPath = '../../shared/footer.html';
        prefix = '../../';
    } else if (currentPath.includes('/notes/') || 
               currentPath.includes('/papers/') || 
               currentPath.includes('/dashboard/')) {
        // 各個分區的主頁
        headerPath = '../shared/header.html';
        footerPath = '../shared/footer.html';
        prefix = '../';
    }

    // 載入頁首
    fetch(headerPath)
        .then(response => response.text())
        .then(html => {
            // 修改導航連結
            const modifiedHtml = html.replace(/href="(.*?)"/g, (match, p1) => {
                if (!p1.startsWith('http')) {
                    return `href="${prefix}${p1}"`;
                }
                return match;
            });
            document.getElementById('header-placeholder').innerHTML = modifiedHtml;
            setActiveNavItem();
        })
        .catch(err => console.error('載入頁首失敗:', err));

    // 載入頁尾
    fetch(footerPath)
        .then(response => response.text())
        .then(html => {
            const modifiedHtml = html.replace(/href="(.*?)"/g, (match, p1) => {
                if (!p1.startsWith('http')) {
                    return `href="${prefix}${p1}"`;
                }
                return match;
            });
            document.getElementById('footer-placeholder').innerHTML = modifiedHtml;
        })
        .catch(err => console.error('載入頁尾失敗:', err));
});

// 設置當前頁面的導航項目為活動狀態
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const section = item.dataset.section;
        if (currentPath.includes(`/${section}/`)) {
            item.classList.add('active');
        }
    });
}

// 防抖動函數
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 日期格式化函數
function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('zh-TW', options);
}

// 複製文字到剪貼簿
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('複製失敗:', err);
        return false;
    }
}

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// 載入 JSON 數據
async function loadJsonData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('載入數據失敗:', error);
        showNotification('載入數據失敗', 'error');
        return null;
    }
}

// 添加動畫效果
function addFadeInAnimation(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    });
}

// 搜索過濾器
function setupSearch(items, filterCallback) {
    const searchBox = document.querySelector('.search-box');
    if (!searchBox) return;

    const debouncedSearch = debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterCallback(searchTerm, items);
    }, 300);

    searchBox.addEventListener('input', debouncedSearch);
}

// 處理圖片載入錯誤
function handleImageError(img) {
    img.onerror = null; // 防止無限遞迴
    img.src = '../assets/images/placeholder.png'; // 設置預設圖片
    img.alt = '圖片載入失敗';
}

// 檢查路徑是否有效
function isValidPath(path) {
    return path && typeof path === 'string' && path.length > 0;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成唯一ID
function generateUniqueId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 驗證URL格式
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 深度合併對象
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    return { ...target, ...source };
}

// 處理API請求錯誤
function handleApiError(error) {
    console.error('API錯誤:', error);
    showNotification(
        error.response?.data?.message || '操作失敗，請稍後重試',
        'error'
    );
    return null;
}

// 本地存儲包裝器
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('存儲數據失敗:', e);
        }
    },
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('讀取數據失敗:', e);
            return null;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('刪除數據失敗:', e);
        }
    }
};

// 檢查設備類型
const device = {
    isMobile: () => window.innerWidth <= 768,
    isTablet: () => window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: () => window.innerWidth > 1024
};

// 主題切換
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    storage.set('theme', isDark ? 'dark' : 'light');
}

// 初始化主題
function initTheme() {
    const savedTheme = storage.get('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}