class EmotionManager {
    constructor() {
        this.currentView = 'home';
        this.currentEmotion = null;
        this.currentTab = 'mine';
        this.isLightMode = false;
        
        this.themeManager = new ThemeManager();
        this.dataManager = new DataManager();
        this.searchManager = new SearchManager(this);
        this.uiManager = new UIManager(this);
        this.storageManager = new StorageManager(this);
    }

    async init() {
        console.log('EmotionManager.init() 开始');
        await this.dataManager.loadData();
        this.loadTheme();
        this.setupEventListeners();
        this.renderAllViews();
        this.switchView('home');
        this.uiManager.initSidebarState();
        this.searchManager.setupInfiniteScroll();
        console.log('EmotionManager.init() 完成');
    }

    loadTheme() {
        try {
            if (this.dataManager.settings && this.dataManager.settings.theme !== undefined) {
                this.isLightMode = this.dataManager.settings.theme;
            } else {
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

    toggleTheme() {
        this.isLightMode = !this.isLightMode;
        this.applyTheme();
        this.saveTheme();
    }

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

    async saveTheme() {
        try {
            if (!this.dataManager.settings) {
                this.dataManager.settings = {};
            }
            this.dataManager.settings.theme = this.isLightMode;
            await this.saveSettings();
            
            localStorage.setItem('emotion-theme', this.isLightMode ? 'light' : 'dark');
        } catch (error) {
            console.error('保存主题失败:', error);
        }
    }

    setupEventListeners() {
        console.log('setupEventListeners() 开始');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) {
                    console.log('导航项点击:', view);
                    this.switchView(view);
                }
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                console.log('选项卡按钮点击:', tab);
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
                this.searchManager.handleSearch();
            }
        });
        searchInput.addEventListener('input', (e) => {
            if (this.currentTab === 'mine') {
                this.searchManager.searchEmotions(e.target.value);
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
                this.storageManager.selectedStorage = btn.dataset.storage;
                this.storageManager.updateStorageHint();
            });
        });

        document.getElementById('addUrlBtn').addEventListener('click', () => {
            this.addEmotionFromUrl();
        });

        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.uploadAndAddEmotion();
        });

        document.getElementById('addTagBtn').addEventListener('click', () => {
            this.uiManager.addTagInput();
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

        document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
            await this.saveSettingsFromForm();
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

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.themeManager.setUserPreference(e.target.value);
            });
        });

        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const settingsType = item.dataset.settings;
                this.switchSettingsPanel(settingsType);
            });
        });

        document.getElementById('selectFolderBtn').addEventListener('click', () => {
            this.storageManager.selectLocalFolder();
        });
        
        console.log('setupEventListeners() 完成');
    }

    switchView(viewName) {
        console.log('EmotionManager.switchView:', viewName);
        this.uiManager.switchView(viewName);
    }

    switchSettingsPanel(panelName) {
        this.uiManager.switchSettingsPanel(panelName);
    }

    switchTab(tabName) {
        console.log('EmotionManager.switchTab:', tabName);
        this.uiManager.switchTab(tabName);
    }

    showModal(modalId) {
        this.uiManager.showModal(modalId);
    }

    hideModal(modal) {
        this.uiManager.hideModal(modal);
    }

    showMessage(message, type = 'info') {
        this.uiManager.showMessage(message, type);
    }

    renderView(viewName) {
        console.log('renderView:', viewName);
        switch(viewName) {
            case 'home':
                this.renderEmotions(this.dataManager.emotions);
                break;
            case 'local':
                this.renderLocalView();
                break;
            case 'cloud':
                this.renderCloudView();
                break;
            case 'settings':
                this.uiManager.loadSettingsToForm();
                break;
        }
        this.uiManager.updateStats();
    }

    renderAllViews() {
        this.renderEmotions(this.dataManager.emotions);
        this.renderLocalView();
        this.renderCloudView();
        this.uiManager.updateStats();
    }

    renderEmotions(emotions) {
        console.log('renderEmotions 调用, 表情包数量:', emotions.length);
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
        
        grid.innerHTML = emotions.map((emotion, index) => {
            const imgSrc = this.storageManager.getImageSrc(emotion);
            return `
            <div class="emotion-card" data-index="${index}">
                <div class="storage-icon ${emotion.storageType}">
                    <i class="mdi mdi-${emotion.storageType === 'cloud' ? 'cloud' : 'folder'}"></i>
                </div>
                <div class="copy-overlay">
                    <button class="copy-btn" data-copy-index="${index}">
                        <i class="mdi mdi-content-copy"></i>
                        <span>复制</span>
                    </button>
                </div>
                <img src="${imgSrc}" alt="表情包" 
                     data-emotion-index="${index}"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+57qn5LmGPC90ZXh0Pjwvc3ZnPg=='">
                <div class="tags">
                    ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                </div>
            </div>
        `}).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            const index = parseInt(card.dataset.index);
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.copy-btn')) {
                    this.showEmotionDetail(this.dataManager.emotions[index]);
                }
            });
        });

        grid.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.copyIndex);
                this.copyEmotionImage(this.dataManager.emotions[index]);
            });
        });

        grid.querySelectorAll('img[data-emotion-index]').forEach(img => {
            const index = parseInt(img.dataset.emotionIndex);
            const emotion = this.dataManager.emotions[index];
            if (emotion && emotion.url && emotion.url.startsWith('utools://')) {
                this.storageManager.loadUtoolsImage(emotion, img);
            }
        });
    }

    renderLocalView() {
        const grid = document.getElementById('localEmotionGrid');
        const emptyState = document.getElementById('localEmptyState');
        const localEmotions = this.dataManager.emotions.filter(e => e.storageType === 'local');
        
        if (localEmotions.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = localEmotions.map((emotion) => {
            const originalIndex = this.dataManager.emotions.indexOf(emotion);
            const imgSrc = this.storageManager.getImageSrc(emotion);
            return `
                <div class="emotion-card" data-index="${originalIndex}">
                    <div class="storage-icon local"><i class="mdi mdi-folder"></i></div>
                    <div class="copy-overlay">
                        <button class="copy-btn" data-copy-index="${originalIndex}">
                            <i class="mdi mdi-content-copy"></i>
                            <span>复制</span>
                        </button>
                    </div>
                    <img src="${imgSrc}" alt="表情包" 
                         data-emotion-index="${originalIndex}"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+57qn5LmGPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="tags">
                        ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            const index = parseInt(card.dataset.index);
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.copy-btn')) {
                    this.showEmotionDetail(this.dataManager.emotions[index]);
                }
            });
        });

        grid.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.copyIndex);
                this.copyEmotionImage(this.dataManager.emotions[index]);
            });
        });

        grid.querySelectorAll('img[data-emotion-index]').forEach(img => {
            const index = parseInt(img.dataset.emotionIndex);
            const emotion = this.dataManager.emotions[index];
            if (emotion && emotion.url && emotion.url.startsWith('utools://')) {
                this.storageManager.loadUtoolsImage(emotion, img);
            }
        });
    }

    renderCloudView() {
        const grid = document.getElementById('cloudEmotionGrid');
        const emptyState = document.getElementById('cloudEmptyState');
        const cloudEmotions = this.dataManager.emotions.filter(e => e.storageType === 'cloud');
        
        if (cloudEmotions.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = cloudEmotions.map((emotion) => {
            const originalIndex = this.dataManager.emotions.indexOf(emotion);
            const imgSrc = this.storageManager.getImageSrc(emotion);
            return `
                <div class="emotion-card" data-index="${originalIndex}">
                    <div class="storage-icon cloud"><i class="mdi mdi-cloud"></i></div>
                    <div class="copy-overlay">
                        <button class="copy-btn" data-copy-index="${originalIndex}">
                            <i class="mdi mdi-content-copy"></i>
                            <span>复制</span>
                        </button>
                    </div>
                    <img src="${imgSrc}" alt="表情包" 
                         data-emotion-index="${originalIndex}"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+57qn5LmGPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="tags">
                        ${emotion.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${emotion.tags.length > 3 ? `<span class="tag">+${emotion.tags.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.emotion-card').forEach(card => {
            const index = parseInt(card.dataset.index);
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.copy-btn')) {
                    this.showEmotionDetail(this.dataManager.emotions[index]);
                }
            });
        });

        grid.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.copyIndex);
                this.copyEmotionImage(this.dataManager.emotions[index]);
            });
        });

        grid.querySelectorAll('img[data-emotion-index]').forEach(img => {
            const index = parseInt(img.dataset.emotionIndex);
            const emotion = this.dataManager.emotions[index];
            if (emotion && emotion.url && emotion.url.startsWith('utools://')) {
                this.storageManager.loadUtoolsImage(emotion, img);
            }
        });
    }

    async showEmotionDetail(emotion) {
        this.currentEmotion = emotion;
        
        const modalImage = document.getElementById('modalImage');
        
        if (emotion.url && emotion.url.startsWith('utools://')) {
            try {
                const fileId = emotion.url.replace('utools://', '');
                const fileData = await utools.db.get(fileId);
                
                if (fileData && fileData.data) {
                    modalImage.src = fileData.data;
                }
            } catch (error) {
                console.error('加载 uTools 图片失败:', error);
            }
        } else {
            modalImage.src = emotion.url;
        }
        
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
        await this.copyEmotionImage(this.currentEmotion);
    }

    async copyEmotionImage(emotion) {
        try {
            if (emotion.url && emotion.url.startsWith('utools://')) {
                const fileId = emotion.url.replace('utools://', '');
                const fileData = await utools.db.get(fileId);
                
                if (fileData && fileData.data) {
                    const img = new Image();
                    img.src = fileData.data;
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = canvas.toDataURL('image/png');
                    const tempImg = new Image();
                    tempImg.src = imageData;
                    
                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                    });
                    
                    utools.copyImage(imageData);
                    this.showMessage('已复制到剪贴板', 'success');
                    return;
                }
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = emotion.url;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = canvas.toDataURL('image/png');
            utools.copyImage(imageData);
            this.showMessage('已复制到剪贴板', 'success');
            
        } catch (error) {
            console.error('复制图片失败:', error);
            
            try {
                if (emotion.url && !emotion.url.startsWith('utools://')) {
                    const response = await fetch(emotion.url);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    
                    reader.onload = async (e) => {
                        const base64Data = e.target.result;
                        utools.copyImage(base64Data);
                        this.showMessage('已复制到剪贴板', 'success');
                    };
                    reader.readAsDataURL(blob);
                }
            } catch (fallbackError) {
                console.error('备用方案也失败了:', fallbackError);
                this.showMessage('复制失败，请重试', 'error');
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

    async saveTags() {
        const tagInput = document.getElementById('tagInput');
        const newTags = tagInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        if (newTags.length === 0) {
            this.showMessage('至少需要一个标签', 'error');
            return;
        }
        
        const index = this.dataManager.emotions.findIndex(e => e.url === this.currentEmotion.url);
        if (index !== -1) {
            this.dataManager.emotions[index].tags = newTags;
            this.currentEmotion.tags = newTags;
            await this.dataManager.saveData();
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

    async deleteCurrentEmotion() {
        if (!this.currentEmotion) return;
        
        if (confirm('确定要删除这个表情包吗？')) {
            const index = this.dataManager.emotions.findIndex(e => e.url === this.currentEmotion.url);
            if (index !== -1) {
                this.dataManager.emotions.splice(index, 1);
                await this.dataManager.saveData();
                this.renderAllViews();
                this.hideModal('emotionModal');
                this.showMessage('表情包已删除', 'success');
            }
        }
    }

    async addFromUrl(url, keyword) {
        const configHint = this.storageManager.getConfigHint();
        if (configHint) {
            this.showMessage(configHint, 'error');
            return;
        }

        if (this.dataManager.emotions.some(e => e.url === url)) {
            this.showMessage('该表情包已存在', 'error');
            return;
        }

        try {
            let finalUrl = url;
            
            if (this.storageManager.selectedStorage === 'local') {
                this.showMessage('正在下载图片到本地...', 'info');
                finalUrl = await this.storageManager.downloadAndSaveToLocal(url);
            }

            const emotion = {
                id: this.dataManager.generateId(),
                url: finalUrl,
                storageType: this.storageManager.selectedStorage,
                tags: [keyword],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.dataManager.emotions.push(emotion);
            await this.dataManager.saveData();
            this.switchTab('mine');
            this.renderEmotions(this.dataManager.emotions);
            this.showMessage('表情包添加成功', 'success');
        } catch (error) {
            console.error('添加表情包失败:', error);
            this.showMessage('添加失败: ' + error.message, 'error');
        }
    }

    async addEmotionFromUrl() {
        const urlInput = document.getElementById('imageUrl');
        
        const url = urlInput.value.trim();
        const tags = this.uiManager.getTagsFromInputs();
        
        if (!url) {
            this.showMessage('请输入图片URL', 'error');
            return;
        }
        
        if (tags.length === 0) {
            this.showMessage('请至少添加一个标签', 'error');
            return;
        }
        
        if (this.dataManager.emotions.some(e => e.url === url)) {
            this.showMessage('该表情包已存在', 'error');
            return;
        }
        
        const configHint = this.storageManager.getConfigHint();
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
            id: this.dataManager.generateId(),
            url: url,
            storageType: this.storageManager.selectedStorage,
            tags: tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.dataManager.emotions.push(emotion);
        await this.dataManager.saveData();
        this.renderAllViews();
        this.hideModal('addModal');
        
        urlInput.value = '';
        this.uiManager.resetTagsInputs();
        
        this.showMessage('表情包添加成功', 'success');
    }

    async uploadAndAddEmotion() {
        const fileInput = document.getElementById('localImage');
        
        if (!fileInput.files[0]) {
            this.showMessage('请选择要上传的图片', 'error');
            return;
        }
        
        const tags = this.uiManager.getTagsFromInputs();
        
        if (tags.length === 0) {
            this.showMessage('请至少添加一个标签', 'error');
            return;
        }
        
        const configHint = this.storageManager.getConfigHint();
        if (configHint) {
            this.showMessage(configHint, 'error');
            return;
        }
        
        try {
            this.showMessage('正在处理...', 'info');
            
            let url;
            
            if (this.storageManager.selectedStorage === 'local') {
                url = await this.storageManager.saveToLocal(fileInput.files[0]);
            } else {
                url = await this.storageManager.uploadToCloud(fileInput.files[0]);
            }
            
            if (this.dataManager.emotions.some(e => e.url === url)) {
                this.showMessage('该表情包已存在', 'error');
                return;
            }
            
            const emotion = {
                id: this.dataManager.generateId(),
                url: url,
                storageType: this.storageManager.selectedStorage,
                tags: tags,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    originalName: fileInput.files[0].name,
                    size: fileInput.files[0].size
                }
            };
            
            this.dataManager.emotions.push(emotion);
            await this.dataManager.saveData();
            this.renderAllViews();
            this.hideModal('addModal');
            
            fileInput.value = '';
            this.uiManager.resetTagsInputs();
            
            this.showMessage('表情包上传成功', 'success');
        } catch (error) {
            console.error('上传失败:', error);
            this.showMessage('上传失败: ' + error.message, 'error');
        }
    }

    async saveSettingsFromForm() {
        console.log('开始保存设置，从表单读取值...');
        
        const newCloudProvider = document.getElementById('cloudProvider').value;
        const newLocalPath = document.getElementById('localPath').value;
        
        console.log('表单中的 cloudProvider:', newCloudProvider);
        console.log('表单中的 localPath:', newLocalPath);
        
        this.dataManager.settings.cloudProvider = newCloudProvider;
        this.dataManager.settings.localPath = newLocalPath;
        
        this.dataManager.settings.cloudConfig = {
            s3Endpoint: document.getElementById('s3Endpoint').value.trim(),
            s3AccessKey: document.getElementById('s3AccessKey').value.trim(),
            s3SecretKey: document.getElementById('s3SecretKey').value.trim(),
            s3Bucket: document.getElementById('s3Bucket').value.trim(),
            s3Region: document.getElementById('s3Region').value.trim(),
            imgbbApiKey: document.getElementById('imgbbApiKey')?.value.trim() || '',
            smmsToken: document.getElementById('smmsToken')?.value.trim() || ''
        };
        
        this.dataManager.settings.syncConfig = {
            provider: document.getElementById('syncProvider').value,
            webdavUrl: document.getElementById('webdavUrl').value.trim(),
            webdavUsername: document.getElementById('webdavUsername').value.trim(),
            webdavPassword: document.getElementById('webdavPassword').value.trim(),
            gitRemote: document.getElementById('gitRemote').value.trim()
        };
        
        const selectedTheme = document.querySelector('input[name="theme"]:checked');
        if (selectedTheme) {
            this.dataManager.settings.themePreference = selectedTheme.value;
            this.themeManager.setUserPreference(selectedTheme.value);
        }
        
        console.log('准备保存到数据库的 settings:', this.dataManager.settings);
        await this.dataManager.saveSettings();
    }

    async saveSettings() {
        await this.dataManager.saveSettings();
    }

    toggleCloudConfig(provider) {
        this.uiManager.toggleCloudConfig(provider);
    }

    toggleSyncConfig(provider) {
        this.uiManager.toggleSyncConfig(provider);
    }

    testCloudConnection() {
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
}
