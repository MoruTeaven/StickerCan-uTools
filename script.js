class ThemeManager {
    constructor() {
        this.THEME_KEY = 'theme_preference';
        this.init();
    }

    init() {
        this.applyTheme(this.getUserPreference());
        this.setupSystemThemeListener();
    }

    getUserPreference() {
        const saved = localStorage.getItem(this.THEME_KEY);
        return saved || 'system';
    }

    setUserPreference(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
        this.applyTheme(theme);
        this.updateThemeRadio(theme);
    }

    applyTheme(preference) {
        const root = document.documentElement;

        if (preference === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.dataset.theme = isDark ? 'dark' : 'light';
        } else {
            root.dataset.theme = preference;
        }
    }

    setupSystemThemeListener() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.getUserPreference() === 'system') {
                this.applyTheme('system');
            }
        });
    }

    updateThemeRadio(theme) {
        const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
}

class EmotionManager {
    constructor() {
        this.emotions = [];
        this.currentView = 'home';
        this.currentEmotion = null;
        this.selectedStorage = 'local';
        this.currentTab = 'mine';
        this.themeManager = new ThemeManager();
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderAllViews();
        this.switchView('home');
        this.initSidebarState();
        this.setupInfiniteScroll();
    }

    initSidebarState() {
        const sidebar = document.querySelector('.sidebar');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        const collapseIcon = document.getElementById('collapseIcon');
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
            collapseIcon.className = 'mdi mdi-menu-right';
        }
        
        collapseBtn.addEventListener('click', () => {
            this.toggleSidebar();
        });
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const collapseIcon = document.getElementById('collapseIcon');
        
        this.sidebarCollapsed = !this.sidebarCollapsed;
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        
        if (this.sidebarCollapsed) {
            collapseIcon.className = 'mdi mdi-menu-right';
        } else {
            collapseIcon.className = 'mdi mdi-menu-left';
        }
        
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
    }

    async loadData() {
        try {
            const emotionsData = await utools.db.get('emotions');
            const settingsData = await utools.db.get('settings');
            
            if (emotionsData) {
                this.emotions = emotionsData.data || [];
            }
            
            if (settingsData) {
                this.settings = settingsData.data;
            } else {
                this.settings = {
                    cloudProvider: 's3',
                    localPath: '',
                    cloudConfig: {},
                    syncConfig: {}
                };
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.emotions = [];
            this.settings = {
                cloudProvider: 's3',
                localPath: '',
                cloudConfig: {},
                syncConfig: {}
            };
        }
    }

    async saveData() {
        try {
            await utools.db.put({
                _id: 'emotions',
                data: this.emotions
            });
        } catch (error) {
            console.error('保存表情包数据失败:', error);
            this.showMessage('保存失败', 'error');
        }
    }

    async saveSettings() {
        try {
            await utools.db.put({
                _id: 'settings',
                data: this.settings
            });
            this.showMessage('设置保存成功', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showMessage('设置保存失败', 'error');
        }
    }

    // 加载主题
    loadTheme() {
        try {
            // 尝试从 settings 中加载主题
            if (this.settings && this.settings.theme !== undefined) {
                this.isLightMode = this.settings.theme;
            } else {
                // 或者从 localStorage 加载（备用方案）
                const savedTheme = localStorage.getItem('emotion-theme');
                if (savedTheme !== null) {
                    this.isLightMode = savedTheme === 'light';
                }
            }
            this.applyTheme();
        } catch (error) {
            console.error('加载主题失败:', error);
        }
    }

    // 切换主题
    toggleTheme() {
        this.isLightMode = !this.isLightMode;
        this.applyTheme();
        this.saveTheme();
    }

    // 应用主题
    applyTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('themeToggle');
        
        if (this.isLightMode) {
            body.classList.add('light-mode');
            themeBtn.innerHTML = '<i class="mdi mdi-weather-night"></i>';
        } else {
            body.classList.remove('light-mode');
            themeBtn.innerHTML = '<i class="mdi mdi-weather-sunny"></i>';
        }
    }

    // 保存主题
    async saveTheme() {
        try {
            // 保存到 settings 中
            if (!this.settings) {
                this.settings = {};
            }
            this.settings.theme = this.isLightMode;
            await this.saveSettings();
            
            // 同时保存到 localStorage 作为备用
            localStorage.setItem('emotion-theme', this.isLightMode ? 'light' : 'dark');
        } catch (error) {
            console.error('保存主题失败:', error);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const settingsPanel = item.dataset.settings;
                if (settingsPanel) {
                    this.switchSettingsPanel(settingsPanel);
                }
            });
        });

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.themeManager.setUserPreference(e.target.value);
            });
        });

        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        searchInput.addEventListener('input', (e) => {
            if (this.currentTab === 'mine') {
                this.searchEmotions(e.target.value);
            }
        });

        document.getElementById('addBtn').addEventListener('click', () => {
            this.showModal('addModal');
        });

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.hideModal(e.target.closest('.modal'));
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedStorage = btn.dataset.storage;
                this.updateStorageHint();
            });
        });

        document.getElementById('addUrlBtn').addEventListener('click', () => {
            this.addEmotionFromUrl();
        });

        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadAndAddEmotion();
        });

        document.getElementById('addTagBtn').addEventListener('click', () => {
            this.addTagInput();
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyEmotionToClipboard();
        });

        document.getElementById('editTagsBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.deleteCurrentEmotion();
        });

        document.getElementById('tagInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTags();
            }
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettingsFromForm();
        });

        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testCloudConnection();
        });

        document.getElementById('cloudProvider').addEventListener('change', (e) => {
            this.toggleCloudConfig(e.target.value);
        });

        document.getElementById('syncProvider').addEventListener('change', (e) => {
            this.toggleSyncConfig(e.target.value);
        });

        document.getElementById('selectFolderBtn').addEventListener('click', () => {
            this.selectLocalFolder();
        });
    }

    switchSettingsPanel(panelName) {
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const navItem = document.querySelector(`.settings-nav-item[data-settings="${panelName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        const panel = document.getElementById(`settings${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`);
        if (panel) {
            panel.classList.add('active');
        }
    }

    async selectLocalFolder() {
        try {
            // 优先直接使用 uTools 原生 API（最可靠）
            if (typeof utools !== 'undefined' && utools.showOpenDialog) {
                try {
                    const result = await utools.showOpenDialog({
                        properties: ['openDirectory', 'createDirectory']
                    });
                    if (Array.isArray(result) && result.length > 0) {
                        const folderPath = result[0];
                        document.getElementById('localPath').value = folderPath;
                        this.settings.localPath = folderPath;
                        this.showMessage('本地存储路径已选择', 'success');
                        return;
                    }
                } catch (apiError) {
                    console.log('uTools showOpenDialog 调用失败:', apiError);
                    // 继续尝试其他方法
                }
            }
            
            // 尝试使用 emotionCan 接口作为后备
            if (window.emotionCan && typeof window.emotionCan.selectFolder === 'function') {
                const folderPath = await window.emotionCan.selectFolder();
                if (folderPath) {
                    document.getElementById('localPath').value = folderPath;
                    this.settings.localPath = folderPath;
                    this.showMessage('本地存储路径已设置', 'success');
                    return;
                }
            }
            
            // 都不可用，设置默认路径并提示用户
            if (window.emotionCan && typeof window.emotionCan.getDefaultDir === 'function') {
                const defaultDir = window.emotionCan.getDefaultDir();
                document.getElementById('localPath').value = defaultDir;
                this.settings.localPath = defaultDir;
                this.showMessage('已使用默认存储路径，请点击保存设置', 'info');
            } else {
                this.showMessage('请在输入框中手动输入本地存储路径', 'info');
            }
        } catch (error) {
            console.error('选择文件夹失败:', error);
            // 出错时也尝试设置默认路径
            try {
                if (window.emotionCan && window.emotionCan.getDefaultDir) {
                    const defaultDir = window.emotionCan.getDefaultDir();
                    document.getElementById('localPath').value = defaultDir;
                    this.settings.localPath = defaultDir;
                }
            } catch (e) {
                console.log('设置默认路径失败');
            }
            this.showMessage('选择文件夹功能暂时不可用，请手动输入路径', 'info');
        }
    }

    switchView(viewName) {
        this.currentView = viewName;
        
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');
        }

        const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.renderView(viewName);
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.clearContent();

        if (tabName === 'mine') {
            this.renderEmotions(this.emotions);
        }

        const keyword = document.getElementById('searchInput').value.trim();
        if (keyword && tabName !== 'mine') {
            this.handleSearch();
        }
    }

    handleSearch() {
        const keyword = document.getElementById('searchInput').value.trim();

        if (this.currentTab === 'mine') {
            this.searchEmotions(keyword);
        } else if (this.currentTab === 'apihz') {
            this.searchApihz(keyword);
        } else if (this.currentTab === 'baidu') {
            this.searchBaidu(keyword);
        } else if (this.currentTab === 'sogou') {
            this.searchSogou(keyword);
        } else if (this.currentTab === 'doutula') {
            this.searchDoutula(keyword);
        } else if (this.currentTab === 'qqtouxiang') {
            this.searchQqtouxiang(keyword);
        }
    }

    clearContent() {
        const emotionGrid = document.getElementById('emotionGrid');
        const externalResults = document.getElementById('externalResults');
        const emptyState = document.getElementById('emptyState');
        
        emotionGrid.style.display = 'none';
        externalResults.style.display = 'none';
        emptyState.style.display = 'none';
        
        emotionGrid.innerHTML = '';
        externalResults.innerHTML = '';
    }

    async searchDoutula(keyword) {
        if (!keyword) {
            this.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'block';
        externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';

        try {
            const url = `https://www.doutula.com/search?keyword=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const images = [];
            const imgElements = doc.querySelectorAll('img[data-original]');
            
            imgElements.forEach(img => {
                const originalSrc = img.getAttribute('data-original') || img.getAttribute('src');
                if (originalSrc && originalSrc.startsWith('http') && !originalSrc.includes('loading')) {
                    images.push(originalSrc);
                }
            });

            if (images.length > 0) {
                this.displayExternalResults(images, keyword);
            } else {
                externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
            }
        } catch (error) {
            console.error('搜索失败:', error);
            externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            this.showMessage('搜索失败: ' + error.message, 'error');
        }
    }

    async searchApihz(keyword, page = 1) {
        if (!keyword) {
            this.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        
        const isFirstPage = page === 1;
        if (isFirstPage) {
            externalResults.style.display = 'block';
            externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';
            this.apihzHasMore = true;
            this.apihzLoading = false;
        } else {
            // 加载后续页面时，确保容器保持 grid 布局
            externalResults.style.display = 'grid';
        }

        try {
            const limit = 30;
            const offset = (page - 1) * limit;
            const url = `https://cn.apihz.cn/api/img/apihzbqb.php?id=10016659&key=60f12f4aec521722296bf562e45d8908&type=1&limit=${limit}&offset=${offset}&words=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200 && data.res && data.res.length > 0) {
                this.currentApihzKeyword = keyword;
                this.currentApihzPage = page;
                
                if (isFirstPage) {
                    this.apihzResults = data.res;
                    this.displayApihzResults(this.apihzResults, keyword, data.res.length === limit);
                } else {
                    this.apihzResults = [...this.apihzResults, ...data.res];
                    this.appendApihzResults(data.res, keyword);
                }
                
                this.apihzHasMore = data.res.length === limit;
                this.apihzLoading = false;
            } else {
                if (isFirstPage) {
                    externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
                } else {
                    this.apihzHasMore = false;
                    this.apihzLoading = false;
                    this.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.showMessage('搜索失败: ' + error.message, 'error');
            this.apihzLoading = false;
        }
    }

    async searchBaidu(keyword, page = 1) {
        if (!keyword) {
            this.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'block';
        
        const isFirstPage = page === 1;
        if (isFirstPage) {
            externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';
            this.baiduHasMore = true;
            this.baiduLoading = false;
        }

        try {
            const limit = 10;
            const url = `https://cn.apihz.cn/api/img/apihzbqbbaidu.php?id=10016659&key=60f12f4aec521722296bf562e45d8908&limit=${limit}&page=${page}&words=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200 && data.res && data.res.length > 0) {
                this.currentBaiduKeyword = keyword;
                this.currentBaiduPage = page;
                
                if (isFirstPage) {
                    this.baiduResults = data.res;
                    this.displayBaiduResults(this.baiduResults, keyword, true);
                } else {
                    this.baiduResults = [...this.baiduResults, ...data.res];
                    this.appendBaiduResults(data.res, keyword);
                }
                
                this.baiduHasMore = data.res.length > 0;
                this.baiduLoading = false;
            } else {
                if (isFirstPage) {
                    externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
                } else {
                    this.baiduHasMore = false;
                    this.baiduLoading = false;
                    this.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.showMessage('搜索失败：' + error.message, 'error');
            this.baiduLoading = false;
        }
    }

    displayBaiduResults(images, keyword, hasMore) {
        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'grid';
        externalResults.innerHTML = images.map((imgUrl, index) => `
            <div class="result-item" data-url="${imgUrl}">
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            </div>
        `).join('');
        
        if (hasMore) {
            externalResults.innerHTML += `
                <div class="load-more-container" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <button class="btn btn-secondary" onclick="emotionManager.loadMoreBaidu()" style="padding: 10px 30px; font-size: 14px;">
                        <i class="mdi mdi-chevron-down"></i> 加载更多
                    </button>
                </div>
            `;
        }
    }

    appendBaiduResults(newImages, keyword) {
        const externalResults = document.getElementById('externalResults');
        const loadMoreContainer = externalResults.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.remove();
        }
        
        newImages.forEach(imgUrl => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.dataset.url = imgUrl;
            div.innerHTML = `
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            `;
            externalResults.appendChild(div);
        });
        
        if (this.baiduHasMore) {
            externalResults.innerHTML += `
                <div class="load-more-container" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <button class="btn btn-secondary" onclick="emotionManager.loadMoreBaidu()" style="padding: 10px 30px; font-size: 14px;">
                        <i class="mdi mdi-chevron-down"></i> 加载更多
                    </button>
                </div>
            `;
        }
    }

    loadMoreBaidu() {
        if (this.currentBaiduKeyword && this.baiduHasMore && !this.baiduLoading) {
            this.baiduLoading = true;
            this.searchBaidu(this.currentBaiduKeyword, this.currentBaiduPage + 1);
        }
    }

    async searchSogou(keyword, page = 1) {
        if (!keyword) {
            this.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'block';
        
        const isFirstPage = page === 1;
        if (isFirstPage) {
            externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';
            this.sogouHasMore = true;
            this.sogouLoading = false;
        }

        try {
            const url = `https://cn.apihz.cn/api/img/apihzbqbsougou.php?id=10016659&key=60f12f4aec521722296bf562e45d8908&page=${page}&words=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200 && data.res && data.res.length > 0) {
                this.currentSogouKeyword = keyword;
                this.currentSogouPage = page;
                
                if (isFirstPage) {
                    this.sogouResults = data.res;
                    this.displaySogouResults(this.sogouResults, keyword, true);
                } else {
                    this.sogouResults = [...this.sogouResults, ...data.res];
                    this.appendSogouResults(data.res, keyword);
                }
                
                this.sogouHasMore = data.res.length > 0;
                this.sogouLoading = false;
            } else {
                if (isFirstPage) {
                    externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
                } else {
                    this.sogouHasMore = false;
                    this.sogouLoading = false;
                    this.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.showMessage('搜索失败: ' + error.message, 'error');
            this.sogouLoading = false;
        }
    }

    displaySogouResults(images, keyword, hasMore) {
        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'grid';
        externalResults.innerHTML = images.map((imgUrl, index) => `
            <div class="result-item" data-url="${imgUrl}">
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            </div>
        `).join('');
    }

    appendSogouResults(newImages, keyword) {
        const externalResults = document.getElementById('externalResults');
        newImages.forEach(imgUrl => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.dataset.url = imgUrl;
            div.innerHTML = `
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            `;
            externalResults.appendChild(div);
        });
    }

    displayApihzResults(images, keyword, hasMore) {
        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'grid';
        externalResults.innerHTML = images.map((imgUrl, index) => `
            <div class="result-item" data-url="${imgUrl}">
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            </div>
        `).join('');
    }

    appendApihzResults(newImages, keyword) {
        const externalResults = document.getElementById('externalResults');
        // 确保容器是 grid 布局
        externalResults.style.display = 'grid';
        
        // 将新元素转换为 HTML 字符串，确保正确应用 grid 布局
        const newHtml = newImages.map(imgUrl => `
            <div class="result-item" data-url="${imgUrl}">
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            </div>
        `).join('');
        
        // 使用 insertAdjacentHTML 在容器末尾添加新元素
        externalResults.insertAdjacentHTML('beforeend', newHtml);
    }

    setupInfiniteScroll() {
        const mainContent = document.querySelector('.main-content');
        
        mainContent.addEventListener('scroll', () => {
            if (this.currentTab === 'apihz' && this.apihzHasMore && !this.apihzLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                // 当滚动到距离底部 200px 时加载更多
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.apihzLoading = true;
                    this.searchApihz(this.currentApihzKeyword, this.currentApihzPage + 1);
                }
            } else if (this.currentTab === 'sogou' && this.sogouHasMore && !this.sogouLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                // 当滚动到距离底部 200px 时加载更多
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.sogouLoading = true;
                    this.searchSogou(this.currentSogouKeyword, this.currentSogouPage + 1);
                }
            }
        });
    }

    async searchQqtouxiang(keyword) {
        if (!keyword) {
            this.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'block';
        externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';

        try {
            const url = `http://www.qqtouxiangzhao.com/search?word=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const images = [];
            const imgElements = doc.querySelectorAll('img');
            
            imgElements.forEach(img => {
                const src = img.getAttribute('src');
                if (src && src.startsWith('http') && !src.includes('loading') && !src.includes('logo')) {
                    images.push(src);
                }
            });

            if (images.length > 0) {
                this.displayExternalResults(images, keyword);
            } else {
                externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
            }
        } catch (error) {
            console.error('搜索失败:', error);
            externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            this.showMessage('搜索失败: ' + error.message, 'error');
        }
    }

    displayExternalResults(images, keyword) {
        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'grid';
        externalResults.innerHTML = images.slice(0, 30).map((imgUrl, index) => `
            <div class="result-item" data-url="${imgUrl}">
                <img src="${imgUrl}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            </div>
        `).join('');
    }

    async addFromUrl(url, keyword) {
        if (this.emotions.some(e => e.url === url)) {
            this.showMessage('该表情包已存在', 'error');
            return;
        }

        const emotion = {
            id: this.generateId(),
            url: url,
            storageType: this.selectedStorage,
            tags: [keyword],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.emotions.push(emotion);
        await this.saveData();
        this.switchTab('mine');
        this.renderEmotions(this.emotions);
        this.showMessage('表情包添加成功', 'success');
    }

    renderView(viewName) {
        switch(viewName) {
            case 'home':
                this.renderEmotions(this.emotions);
                break;
            case 'local':
                this.renderLocalView();
                break;
            case 'cloud':
                this.renderCloudView();
                break;
            case 'settings':
                this.loadSettingsToForm();
                break;
        }
        this.updateStats();
    }

    renderAllViews() {
        this.renderEmotions(this.emotions);
        this.renderLocalView();
        this.renderCloudView();
        this.updateStats();
    }

    renderEmotions(emotions) {
        const grid = document.getElementById('emotionGrid');
        const externalResults = document.getElementById('externalResults');
        const emptyState = document.getElementById('emptyState');
        
        externalResults.style.display = 'none';
        
        if (emotions.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = emotions.map((emotion, index) => `
            <div class="emotion-card" data-index="${index}">
                <div class="storage-icon ${emotion.storageType}">
                    <i class="mdi mdi-${emotion.storageType === 'cloud' ? 'cloud' : 'folder'}"></i>
                </div>
                <img src="${emotion.url}" alt="表情包" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <div class="tags">
                    ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showEmotionDetail(this.emotions[index]);
            });
        });
    }

    renderLocalView() {
        const grid = document.getElementById('localEmotionGrid');
        const emptyState = document.getElementById('localEmptyState');
        const localEmotions = this.emotions.filter(e => e.storageType === 'local');
        
        if (localEmotions.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = localEmotions.map((emotion, idx) => {
            const originalIndex = this.emotions.indexOf(emotion);
            return `
                <div class="emotion-card" data-index="${originalIndex}">
                    <div class="storage-icon local"><i class="mdi mdi-folder"></i></div>
                    <img src="${emotion.url}" alt="表情包" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="tags">
                        ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showEmotionDetail(this.emotions[index]);
            });
        });
    }

    renderCloudView() {
        const grid = document.getElementById('cloudEmotionGrid');
        const emptyState = document.getElementById('cloudEmptyState');
        const cloudEmotions = this.emotions.filter(e => e.storageType === 'cloud');
        
        if (cloudEmotions.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = cloudEmotions.map((emotion) => {
            const originalIndex = this.emotions.indexOf(emotion);
            return `
                <div class="emotion-card" data-index="${originalIndex}">
                    <div class="storage-icon cloud"><i class="mdi mdi-cloud"></i></div>
                    <img src="${emotion.url}" alt="表情包" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIjc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="tags">
                        ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                this.showEmotionDetail(this.emotions[index]);
            });
        });
    }

    updateStats() {
        const total = this.emotions.length;
        const cloudCount = this.emotions.filter(e => e.storageType === 'cloud').length;
        const localCount = this.emotions.filter(e => e.storageType === 'local').length;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('cloudCount').textContent = cloudCount;
        document.getElementById('localCount').textContent = localCount;
    }

    searchEmotions(query) {
        if (!query.trim()) {
            this.renderEmotions(this.emotions);
            return;
        }
        
        const filtered = this.emotions.filter(emotion => {
            if (!emotion.tags || !Array.isArray(emotion.tags)) {
                return false;
            }
            
            return emotion.tags.some(tag => 
                tag && typeof tag === 'string' && 
                tag.toLowerCase().includes(query.toLowerCase())
            );
        });
        
        this.renderEmotions(filtered);
    }

    showEmotionDetail(emotion) {
        this.currentEmotion = emotion;
        
        document.getElementById('modalImage').src = emotion.url;
        
        const badge = document.getElementById('storageBadge');
        badge.className = `storage-badge ${emotion.storageType}`;
        badge.innerHTML = `
            <i class="mdi mdi-${emotion.storageType === 'cloud' ? 'cloud' : 'folder'}"></i>
            <span class="badge-text">${emotion.storageType === 'cloud' ? '云端存储' : '本地存储'}</span>
        `;
        
        document.getElementById('tagList').innerHTML = emotion.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
        
        this.showModal('emotionModal');
    }

    async copyEmotionToClipboard() {
        if (!this.currentEmotion) return;
        
        try {
            const response = await fetch(this.currentEmotion.url);
            const blob = await response.blob();
            
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            this.showMessage('已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            try {
                utools.copyText(this.currentEmotion.url);
                this.showMessage('URL已复制到剪贴板', 'success');
            } catch (urlError) {
                this.showMessage('复制失败', 'error');
            }
        }
    }

    toggleEditMode() {
        const tagList = document.getElementById('tagList');
        const tagInput = document.getElementById('tagInput');
        const editBtn = document.getElementById('editTagsBtn');
        
        if (tagInput.style.display === 'none') {
            tagInput.style.display = 'block';
            tagInput.value = this.currentEmotion.tags.join(', ');
            tagInput.focus();
            editBtn.innerHTML = '<i class="mdi mdi-content-save"></i> 保存标签';
        } else {
            this.saveTags();
        }
    }

    saveTags() {
        const tagInput = document.getElementById('tagInput');
        const newTags = tagInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        if (newTags.length === 0) {
            this.showMessage('至少需要一个标签', 'error');
            return;
        }
        
        const index = this.emotions.findIndex(e => e.url === this.currentEmotion.url);
        if (index !== -1) {
            this.emotions[index].tags = newTags;
            this.currentEmotion.tags = newTags;
            this.saveData();
            this.renderAllViews();
            
            document.getElementById('tagList').innerHTML = newTags.map(tag => 
                `<span class="tag">${tag}</span>`
            ).join('');
            
            const editBtn = document.getElementById('editTagsBtn');
            tagInput.style.display = 'none';
            editBtn.innerHTML = '<i class="mdi mdi-tag"></i> 编辑标签';
            this.showMessage('标签已更新', 'success');
        }
    }

    deleteCurrentEmotion() {
        if (!this.currentEmotion) return;
        
        if (confirm('确定要删除这个表情包吗？')) {
            const index = this.emotions.findIndex(e => e.url === this.currentEmotion.url);
            if (index !== -1) {
                this.emotions.splice(index, 1);
                this.saveData();
                this.renderAllViews();
                this.hideModal('emotionModal');
                this.showMessage('表情包已删除', 'success');
            }
        }
    }

    addTagInput() {
        const container = document.getElementById('tagsInputsContainer');
        const wrapper = document.createElement('div');
        wrapper.className = 'tag-input-wrapper';
        wrapper.innerHTML = `
            <input type="text" class="tag-input" placeholder="输入标签">
            <button type="button" class="remove-tag-btn">
                <i class="mdi mdi-close"></i>
            </button>
        `;
        container.appendChild(wrapper);
        
        const removeBtn = wrapper.querySelector('.remove-tag-btn');
        removeBtn.addEventListener('click', () => {
            wrapper.remove();
        });
        
        wrapper.querySelector('.tag-input').focus();
    }

    getTagsFromInputs() {
        const inputs = document.querySelectorAll('#tagsInputsContainer .tag-input');
        const tags = [];
        inputs.forEach(input => {
            const tag = input.value.trim();
            if (tag) {
                tags.push(tag);
            }
        });
        return tags;
    }

    resetTagsInputs() {
        const container = document.getElementById('tagsInputsContainer');
        container.innerHTML = `
            <div class="tag-input-wrapper">
                <input type="text" class="tag-input" placeholder="输入标签">
            </div>
        `;
    }

    async addEmotionFromUrl() {
        const urlInput = document.getElementById('imageUrl');
        
        const url = urlInput.value.trim();
        const tags = this.getTagsFromInputs();
        
        if (!url) {
            this.showMessage('请输入图片URL', 'error');
            return;
        }
        
        if (tags.length === 0) {
            this.showMessage('请至少添加一个标签', 'error');
            return;
        }
        
        if (this.emotions.some(e => e.url === url)) {
            this.showMessage('该表情包已存在', 'error');
            return;
        }
        
        const configHint = this.getConfigHint();
        if (configHint) {
            this.showMessage(configHint, 'error');
            return;
        }
        
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error('图片URL无效');
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('URL不是图片格式');
            }
        } catch (error) {
            this.showMessage('图片URL验证失败: ' + error.message, 'error');
            return;
        }
        
        const emotion = {
            id: this.generateId(),
            url: url,
            storageType: this.selectedStorage,
            tags: tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.emotions.push(emotion);
        await this.saveData();
        this.renderAllViews();
        this.hideModal('addModal');
        
        urlInput.value = '';
        this.resetTagsInputs();
        
        this.showMessage('表情包添加成功', 'success');
    }

    async uploadAndAddEmotion() {
        const fileInput = document.getElementById('localImage');
        
        if (!fileInput.files[0]) {
            this.showMessage('请选择要上传的图片', 'error');
            return;
        }
        
        const tags = this.getTagsFromInputs();
        
        if (tags.length === 0) {
            this.showMessage('请至少添加一个标签', 'error');
            return;
        }
        
        const configHint = this.getConfigHint();
        if (configHint) {
            this.showMessage(configHint, 'error');
            return;
        }
        
        try {
            this.showMessage('正在处理...', 'info');
            
            let url;
            
            if (this.selectedStorage === 'local') {
                url = await this.saveToLocal(fileInput.files[0]);
            } else {
                url = await this.uploadToCloud(fileInput.files[0]);
            }
            
            if (this.emotions.some(e => e.url === url)) {
                this.showMessage('该表情包已存在', 'error');
                return;
            }
            
            const emotion = {
                id: this.generateId(),
                url: url,
                storageType: this.selectedStorage,
                tags: tags,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    originalName: fileInput.files[0].name,
                    size: fileInput.files[0].size
                }
            };
            
            this.emotions.push(emotion);
            await this.saveData();
            this.renderAllViews();
            this.hideModal('addModal');
            
            fileInput.value = '';
            this.resetTagsInputs();
            
            this.showMessage('表情包上传成功', 'success');
        } catch (error) {
            console.error('上传失败:', error);
            this.showMessage('上传失败: ' + error.message, 'error');
        }
    }

    async saveToLocal(file) {
        if (!this.settings.localPath) {
            throw new Error('请先在设置中配置本地存储路径');
        }
        
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fullPath = `${this.settings.localPath}/${fileName}`;
        
        if (window.emotionCan && typeof window.emotionCan.saveFile === 'function') {
            try {
                const base64 = await this.fileToBase64(file);
                const savedPath = await window.emotionCan.saveFile(base64, fullPath);
                // 返回可访问的路径（对于本地文件，我们可以用 file:// 协议）
                const fileUrl = `file://${savedPath.replace(/\\/g, '/')}`;
                return fileUrl;
            } catch (error) {
                console.error('保存到本地失败:', error);
                throw new Error('保存文件到本地失败: ' + error.message);
            }
        } else {
            // 非 uTools 环境，返回临时 URL
            return URL.createObjectURL(file);
        }
    }

    async uploadToCloud(file) {
        const provider = this.settings.cloudProvider;
        
        if (provider === 'imgbb') {
            return await this.uploadToImgBB(file);
        } else if (provider === 'smms') {
            return await this.uploadToSMMS(file);
        } else {
            throw new Error('请先配置云存储');
        }
    }

    async uploadToImgBB(file) {
        const apiKey = this.settings.cloudConfig.imgbbApiKey;
        if (!apiKey) {
            throw new Error('请先配置ImgBB API Key');
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error(data.error?.message || '上传失败');
        }
    }

    async uploadToSMMS(file) {
        const token = this.settings.cloudConfig.smmsToken;
        if (!token) {
            throw new Error('请先配置SM.MS Token');
        }
        
        const formData = new FormData();
        formData.append('smfile', file);
        
        const response = await fetch('https://sm.ms/api/v2/upload', {
            method: 'POST',
            headers: {
                'Authorization': token
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error(data.images || data.msg || '上传失败');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    checkLocalConfig() {
        return this.settings && this.settings.localPath && this.settings.localPath.trim() !== '';
    }

    checkCloudConfig() {
        if (!this.settings) return false;
        
        const provider = this.settings.cloudProvider;
        if (!provider) return false;
        
        if (provider === 'imgbb') {
            return this.settings.cloudConfig && this.settings.cloudConfig.imgbbApiKey && this.settings.cloudConfig.imgbbApiKey.trim() !== '';
        } else if (provider === 'smms') {
            return this.settings.cloudConfig && this.settings.cloudConfig.smmsToken && this.settings.cloudConfig.smmsToken.trim() !== '';
        } else if (provider === 's3') {
            return this.settings.cloudConfig && 
                   this.settings.cloudConfig.s3Endpoint && 
                   this.settings.cloudConfig.s3AccessKey && 
                   this.settings.cloudConfig.s3SecretKey && 
                   this.settings.cloudConfig.s3Bucket;
        } else if (provider === 'github') {
            return this.settings.cloudConfig && 
                   this.settings.cloudConfig.s3Endpoint && 
                   this.settings.cloudConfig.s3AccessKey && 
                   this.settings.cloudConfig.s3SecretKey;
        }
        return false;
    }

    getConfigHint() {
        if (this.selectedStorage === 'local') {
            if (!this.checkLocalConfig()) {
                return '请先在设置中配置本地存储路径';
            }
            return null;
        } else {
            if (!this.checkCloudConfig()) {
                return '请先在设置中配置云存储';
            }
            return null;
        }
    }

    updateStorageHint() {
        const hint = document.getElementById('storageHint');
        const configHint = this.getConfigHint();
        if (configHint) {
            hint.innerHTML = '<i class="mdi mdi-alert"></i> ' + configHint;
            hint.style.color = '#ff6b6b';
        } else {
            if (this.selectedStorage === 'local') {
                hint.innerHTML = '<i class="mdi mdi-information"></i> 本地存储不会同步到其他设备';
            } else {
                hint.innerHTML = '<i class="mdi mdi-information"></i> 云端存储会同步到其他设备';
            }
            hint.style.color = '';
        }
    }

    loadSettingsToForm() {
        const themePreference = this.themeManager.getUserPreference();
        const themeRadio = document.querySelector(`input[name="theme"][value="${themePreference}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
        }

        document.getElementById('cloudProvider').value = this.settings.cloudProvider || 'imgbb';

        if (!this.settings.localPath && window.emotionCan && typeof window.emotionCan.getDefaultDir === 'function') {
            this.settings.localPath = window.emotionCan.getDefaultDir();
        }
        document.getElementById('localPath').value = this.settings.localPath || '';

        document.getElementById('syncProvider').value = this.settings.syncConfig?.provider || 'none';

        if (this.settings.cloudConfig) {
            document.getElementById('s3Endpoint').value = this.settings.cloudConfig.s3Endpoint || '';
            document.getElementById('s3AccessKey').value = this.settings.cloudConfig.s3AccessKey || '';
            document.getElementById('s3SecretKey').value = this.settings.cloudConfig.s3SecretKey || '';
            document.getElementById('s3Bucket').value = this.settings.cloudConfig.s3Bucket || '';
            document.getElementById('s3Region').value = this.settings.cloudConfig.s3Region || '';
            const imgbbApiKeyInput = document.getElementById('imgbbApiKey');
            if (imgbbApiKeyInput) imgbbApiKeyInput.value = this.settings.cloudConfig.imgbbApiKey || '';
            const smmsTokenInput = document.getElementById('smmsToken');
            if (smmsTokenInput) smmsTokenInput.value = this.settings.cloudConfig.smmsToken || '';
        }

        if (this.settings.syncConfig) {
            document.getElementById('webdavUrl').value = this.settings.syncConfig.webdavUrl || '';
            document.getElementById('webdavUsername').value = this.settings.syncConfig.webdavUsername || '';
            document.getElementById('webdavPassword').value = this.settings.syncConfig.webdavPassword || '';
            document.getElementById('gitRemote').value = this.settings.syncConfig.gitRemote || '';
        }

        this.toggleCloudConfig(this.settings.cloudProvider || 'imgbb');
        this.toggleSyncConfig(this.settings.syncConfig?.provider || 'none');
    }

    saveSettingsFromForm() {
        this.settings.cloudProvider = document.getElementById('cloudProvider').value;
        this.settings.localPath = document.getElementById('localPath').value;
        
        this.settings.cloudConfig = {
            s3Endpoint: document.getElementById('s3Endpoint').value.trim(),
            s3AccessKey: document.getElementById('s3AccessKey').value.trim(),
            s3SecretKey: document.getElementById('s3SecretKey').value.trim(),
            s3Bucket: document.getElementById('s3Bucket').value.trim(),
            s3Region: document.getElementById('s3Region').value.trim(),
            imgbbApiKey: document.getElementById('imgbbApiKey')?.value.trim() || '',
            smmsToken: document.getElementById('smmsToken')?.value.trim() || ''
        };
        
        this.settings.syncConfig = {
            provider: document.getElementById('syncProvider').value,
            webdavUrl: document.getElementById('webdavUrl').value.trim(),
            webdavUsername: document.getElementById('webdavUsername').value.trim(),
            webdavPassword: document.getElementById('webdavPassword').value.trim(),
            gitRemote: document.getElementById('gitRemote').value.trim()
        };
        
        this.saveSettings();
    }

    toggleCloudConfig(provider) {
        const s3Config = document.getElementById('s3Config');
        const imgbbConfig = document.getElementById('imgbbConfig');
        const smmsConfig = document.getElementById('smmsConfig');
        
        s3Config.style.display = 'none';
        imgbbConfig.style.display = 'none';
        smmsConfig.style.display = 'none';
        
        if (provider === 's3' || provider === 'github') {
            s3Config.style.display = 'block';
        } else if (provider === 'imgbb') {
            imgbbConfig.style.display = 'block';
        } else if (provider === 'smms') {
            smmsConfig.style.display = 'block';
        }
    }

    toggleSyncConfig(provider) {
        const webdavConfig = document.getElementById('webdavConfig');
        const gitConfig = document.getElementById('gitConfig');
        const syncActions = document.getElementById('syncActions');

        webdavConfig.style.display = 'none';
        gitConfig.style.display = 'none';
        syncActions.style.display = 'none';

        if (provider === 'webdav') {
            webdavConfig.style.display = 'block';
            syncActions.style.display = 'flex';
        } else if (provider === 'git') {
            gitConfig.style.display = 'block';
            syncActions.style.display = 'flex';
        }
    }

    async testCloudConnection() {
        const provider = document.getElementById('cloudProvider').value;
        
        if (provider === 'imgbb') {
            const apiKey = document.getElementById('imgbbApiKey')?.value;
            if (!apiKey) {
                this.showMessage('请先配置ImgBB API Key', 'error');
                return;
            }
            this.showMessage('ImgBB配置正常', 'success');
        } else if (provider === 'smms') {
            const token = document.getElementById('smmsToken')?.value;
            if (!token) {
                this.showMessage('请先配置SM.MS Token', 'error');
                return;
            }
            this.showMessage('SM.MS配置正常', 'success');
        } else if (provider === 's3' || provider === 'github') {
            const endpoint = document.getElementById('s3Endpoint')?.value;
            const accessKey = document.getElementById('s3AccessKey')?.value;
            const secretKey = document.getElementById('s3SecretKey')?.value;
            const bucket = document.getElementById('s3Bucket')?.value;
            if (!endpoint || !accessKey || !secretKey || !bucket) {
                this.showMessage('请先完整配置S3存储信息', 'error');
                return;
            }
            this.showMessage('S3配置已保存，请点击保存设置', 'info');
        } else {
            this.showMessage('请检查云存储配置', 'info');
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        
        if (modalId === 'addModal') {
            this.updateStorageHint();
        }
    }

    hideModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        modal.style.display = 'none';
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        const bgColor = this.isLightMode ? '#ffffff' : '#1a1a1a';
        const textColor = this.isLightMode ? '#000000' : '#ffffff';
        const borderColor = this.isLightMode ? '#e0e0e0' : '#333333';
        
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            background: ${bgColor};
            color: ${textColor};
            border: 2px solid ${borderColor};
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

let emotionManager;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof utools !== 'undefined') {
        emotionManager = new EmotionManager();
    } else {
        console.warn('不在uTools环境中，使用localStorage模拟数据存储');
        
        // 模拟 uTools
        window.utools = {
            db: {
                async get(key) {
                    const value = localStorage.getItem(key);
                    return value ? JSON.parse(value) : null;
                },
                async put(doc) {
                    localStorage.setItem(doc._id, JSON.stringify(doc));
                }
            }
        };

        // 模拟 emotionCan API（用于开发调试）
        window.emotionCan = {
            selectFolder: async function() {
                return prompt('请输入本地存储路径（例如：C:/表情罐头）');
            },
            saveFile: async function(fileData, targetPath) {
                console.log('模拟保存文件到:', targetPath);
                return targetPath;
            },
            fileExists: function(filePath) {
                console.log('模拟检查文件存在:', filePath);
                return false;
            },
            getDefaultDir: function() {
                return 'C:/表情罐头';
            }
        };
        
        emotionManager = new EmotionManager();
    }
});

window.emotionManager = emotionManager;
