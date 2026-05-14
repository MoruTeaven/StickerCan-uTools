class SearchManager {
    constructor(emotionManager) {
        this.emotionManager = emotionManager;
        this.apihzResults = [];
        this.currentApihzKeyword = '';
        this.currentApihzPage = 1;
        this.apihzHasMore = true;
        this.apihzLoading = false;
        
        this.baiduResults = [];
        this.currentBaiduKeyword = '';
        this.currentBaiduPage = 1;
        this.baiduHasMore = true;
        this.baiduLoading = false;
        
        this.sogouResults = [];
        this.currentSogouKeyword = '';
        this.currentSogouPage = 1;
        this.sogouHasMore = true;
        this.sogouLoading = false;
        
        this.tangdouziResults = [];
        this.currentTangdouziKeyword = '';
        this.currentTangdouziPage = 1;
        this.tangdouziHasMore = true;
        this.tangdouziLoading = false;
    }

    handleSearch() {
        const keyword = document.getElementById('searchInput').value.trim();
        const currentTab = this.emotionManager.currentTab;

        if (currentTab === 'mine') {
            this.searchEmotions(keyword);
        } else if (currentTab === 'apihz') {
            this.searchApihz(keyword);
        } else if (currentTab === 'baidu') {
            this.searchBaidu(keyword);
        } else if (currentTab === 'sogou') {
            this.searchSogou(keyword);
        } else if (currentTab === 'tangdouzi') {
            this.searchTangdouzi(keyword);
        }
    }

    clearContent() {
        console.log('clearContent 被调用');
        const emotionGrid = document.getElementById('emotionGrid');
        const externalResults = document.getElementById('externalResults');
        const emptyState = document.getElementById('emptyState');
        
        if (!emotionGrid || !externalResults || !emptyState) {
            console.error('clearContent: DOM元素未找到');
            return;
        }
        
        emotionGrid.style.display = 'none';
        externalResults.style.display = 'none';
        emptyState.style.display = 'none';
        
        emotionGrid.innerHTML = '';
        externalResults.innerHTML = '';
    }

    async searchApihz(keyword, page = 1) {
        if (!keyword) {
            this.emotionManager.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        externalResults.style.display = 'block';
        
        const isFirstPage = page === 1;
        if (isFirstPage) {
            externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';
            this.apihzHasMore = true;
            this.apihzLoading = false;
        }

        try {
            const limit = 30;
            const offset = (page - 1) * limit;
            const url = `https://cn.apihz.cn/api/img/apihzbqb.php?id=10016659&key=60f12f4aec521722296bf562e45d8908&type=1&limit=${limit}&offset=${offset}&words=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('ApiHz API返回:', data);
            
            // 兼容不同的数据结构
            let imageUrls = [];
            if (data.code === 200 && data.res) {
                if (Array.isArray(data.res)) {
                    imageUrls = data.res;
                } else if (typeof data.res === 'string') {
                    imageUrls = [data.res];
                }
            } else if (Array.isArray(data)) {
                imageUrls = data;
            } else if (data.url) {
                imageUrls = [data.url];
            }
            
            if (imageUrls.length > 0) {
                this.currentApihzKeyword = keyword;
                this.currentApihzPage = page;
                
                if (isFirstPage) {
                    this.apihzResults = imageUrls;
                    this.displayApihzResults(this.apihzResults, keyword, true);
                } else {
                    this.apihzResults = [...this.apihzResults, ...imageUrls];
                    this.appendApihzResults(imageUrls, keyword);
                }
                
                this.apihzHasMore = imageUrls.length > 0;
                this.apihzLoading = false;
            } else {
                if (isFirstPage) {
                    externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
                } else {
                    this.apihzHasMore = false;
                    this.apihzLoading = false;
                    this.emotionManager.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.emotionManager.showMessage('搜索失败: ' + error.message, 'error');
            this.apihzLoading = false;
        }
    }

    displayApihzResults(images, keyword, hasMore) {
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
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreApihz()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    appendApihzResults(newImages, keyword) {
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
        
        if (this.apihzHasMore) {
            externalResults.innerHTML += `
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreApihz()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    loadMoreApihz() {
        if (this.currentApihzKeyword && this.apihzHasMore && !this.apihzLoading) {
            this.apihzLoading = true;
            const btn = document.querySelector('.load-more-btn');
            if (btn) {
                btn.classList.add('loading');
                btn.querySelector('.mdi').classList.remove('mdi-chevron-down');
                btn.querySelector('.mdi').classList.add('mdi-loading');
            }
            this.searchApihz(this.currentApihzKeyword, this.currentApihzPage + 1);
        }
    }

    async searchBaidu(keyword, page = 1) {
        if (!keyword) {
            this.emotionManager.showMessage('请输入搜索关键词', 'error');
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
                    this.emotionManager.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.emotionManager.showMessage('搜索失败: ' + error.message, 'error');
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
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreBaidu()">
                        <i class="mdi mdi-chevron-down"></i> 继续
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
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreBaidu()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    loadMoreBaidu() {
        if (this.currentBaiduKeyword && this.baiduHasMore && !this.baiduLoading) {
            this.baiduLoading = true;
            const btn = document.querySelector('.load-more-btn');
            if (btn) {
                btn.classList.add('loading');
                btn.querySelector('.mdi').classList.remove('mdi-chevron-down');
                btn.querySelector('.mdi').classList.add('mdi-loading');
            }
            this.searchBaidu(this.currentBaiduKeyword, this.currentBaiduPage + 1);
        }
    }

    async searchSogou(keyword, page = 1) {
        if (!keyword) {
            this.emotionManager.showMessage('请输入搜索关键词', 'error');
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
                    this.emotionManager.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.emotionManager.showMessage('搜索失败: ' + error.message, 'error');
            this.sogouLoading = false;
        }
    }

    displaySogouResults(images, keyword, hasMore) {
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
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreSogou()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    appendSogouResults(newImages, keyword) {
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
        
        if (this.sogouHasMore) {
            externalResults.innerHTML += `
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreSogou()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    loadMoreSogou() {
        if (this.currentSogouKeyword && this.sogouHasMore && !this.sogouLoading) {
            this.sogouLoading = true;
            const btn = document.querySelector('.load-more-btn');
            if (btn) {
                btn.classList.add('loading');
                btn.querySelector('.mdi').classList.remove('mdi-chevron-down');
                btn.querySelector('.mdi').classList.add('mdi-loading');
            }
            this.searchSogou(this.currentSogouKeyword, this.currentSogouPage + 1);
        }
    }

    async searchTangdouzi(keyword, page = 1) {
        if (!keyword) {
            this.emotionManager.showMessage('请输入搜索关键词', 'error');
            return;
        }

        const externalResults = document.getElementById('externalResults');
        
        const isFirstPage = page === 1;
        if (isFirstPage) {
            externalResults.style.display = 'block';
            externalResults.innerHTML = '<p class="hint-text">正在搜索...</p>';
            this.tangdouziHasMore = true;
            this.tangdouziLoading = false;
        } else {
            externalResults.style.display = 'grid';
        }

        try {
            const url = `https://api.tangdouz.com/a/biaoq.php?return=json&nr=${encodeURIComponent(keyword)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('糖豆子API返回:', data);
            
            let imageUrls = [];
            if (Array.isArray(data) && data.length > 0) {
                imageUrls = data.map(item => item.thumbSrc || item.url || item);
            } else if (data.code === 200 && data.res) {
                if (Array.isArray(data.res)) {
                    imageUrls = data.res.map(item => item.thumbSrc || item.url || item);
                } else if (typeof data.res === 'string') {
                    imageUrls = [data.res];
                }
            }
            
            if (imageUrls.length > 0) {
                this.currentTangdouziKeyword = keyword;
                this.currentTangdouziPage = page;
                
                if (isFirstPage) {
                    this.tangdouziResults = imageUrls;
                    // 糖豆子接口不支持分页，但我们可以显示按钮让用户再次搜索或刷新
                    this.displayTangdouziResults(this.tangdouziResults, keyword, true);
                } else {
                    // 追加新内容，避免重复
                    const newUniqueUrls = imageUrls.filter(url => !this.tangdouziResults.includes(url));
                    if (newUniqueUrls.length > 0) {
                        this.tangdouziResults = [...this.tangdouziResults, ...newUniqueUrls];
                        this.appendTangdouziResults(newUniqueUrls, keyword);
                    } else {
                        // 如果没有新内容，显示提示
                        this.tangdouziHasMore = false;
                        this.tangdouziLoading = false;
                        const btn = document.querySelector('.load-more-container');
                        if (btn) {
                            btn.remove();
                        }
                        this.emotionManager.showMessage('没有更多新表情包了', 'info');
                        return;
                    }
                }
                
                // 糖豆子接口可能会返回重复内容，所以始终显示继续按钮
                this.tangdouziHasMore = true;
                this.tangdouziLoading = false;
            } else {
                if (isFirstPage) {
                    externalResults.innerHTML = '<p class="hint-text">未找到表情包，请尝试其他关键词</p>';
                } else {
                    this.tangdouziHasMore = false;
                    this.tangdouziLoading = false;
                    this.emotionManager.showMessage('没有更多表情包了', 'info');
                }
            }
        } catch (error) {
            console.error('搜索失败:', error);
            if (isFirstPage) {
                externalResults.innerHTML = '<p class="hint-text">搜索失败，请稍后重试</p>';
            }
            this.emotionManager.showMessage('搜索失败: ' + error.message, 'error');
            this.tangdouziLoading = false;
        }
    }

    displayTangdouziResults(images, keyword, hasMore) {
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
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreTangdouzi()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    appendTangdouziResults(newImages, keyword) {
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
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzc3NyIgPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <button class="add-btn" onclick="emotionManager.addFromUrl('${imgUrl}', '${keyword}')">
                    <i class="mdi mdi-plus"></i> 添加到我的
                </button>
            `;
            externalResults.appendChild(div);
        });
        
        if (this.tangdouziHasMore) {
            externalResults.innerHTML += `
                <div class="load-more-container">
                    <button class="load-more-btn" onclick="emotionManager.searchManager.loadMoreTangdouzi()">
                        <i class="mdi mdi-chevron-down"></i> 继续
                    </button>
                </div>
            `;
        }
    }

    loadMoreTangdouzi() {
        if (this.currentTangdouziKeyword && this.tangdouziHasMore && !this.tangdouziLoading) {
            this.tangdouziLoading = true;
            const btn = document.querySelector('.load-more-btn');
            if (btn) {
                btn.classList.add('loading');
                btn.querySelector('.mdi').classList.remove('mdi-chevron-down');
                btn.querySelector('.mdi').classList.add('mdi-loading');
            }
            // 传入page=2，让代码走追加逻辑
            this.searchTangdouzi(this.currentTangdouziKeyword, 2);
        }
    }

    searchEmotions(keyword) {
        if (!keyword.trim()) {
            this.emotionManager.renderEmotions(this.emotionManager.dataManager.emotions);
            return;
        }
        
        const filtered = this.emotionManager.dataManager.emotions.filter(emotion => {
            if (!emotion.tags || !Array.isArray(emotion.tags)) {
                return false;
            }
            
            return emotion.tags.some(tag => 
                tag && typeof tag === 'string' && 
                tag.toLowerCase().includes(keyword.toLowerCase())
            );
        });
        
        this.emotionManager.renderEmotions(filtered);
    }

    setupInfiniteScroll() {
        const mainContent = document.querySelector('.main-content');
        
        mainContent.addEventListener('scroll', () => {
            const currentTab = this.emotionManager.currentTab;
            
            if (currentTab === 'apihz' && this.apihzHasMore && !this.apihzLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.apihzLoading = true;
                    this.searchApihz(this.currentApihzKeyword, this.currentApihzPage + 1);
                }
            } else if (currentTab === 'baidu' && this.baiduHasMore && !this.baiduLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.baiduLoading = true;
                    this.searchBaidu(this.currentBaiduKeyword, this.currentBaiduPage + 1);
                }
            } else if (currentTab === 'sogou' && this.sogouHasMore && !this.sogouLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.sogouLoading = true;
                    this.searchSogou(this.currentSogouKeyword, this.currentSogouPage + 1);
                }
            } else if (currentTab === 'tangdouzi' && this.tangdouziHasMore && !this.tangdouziLoading) {
                const scrollHeight = mainContent.scrollHeight;
                const scrollTop = mainContent.scrollTop;
                const clientHeight = mainContent.clientHeight;
                
                if (scrollTop + clientHeight >= scrollHeight - 200) {
                    this.tangdouziLoading = true;
                    this.searchTangdouzi(this.currentTangdouziKeyword, this.currentTangdouziPage + 1);
                }
            }
        });
    }
}
