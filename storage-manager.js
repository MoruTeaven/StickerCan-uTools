class StorageManager {
    constructor(emotionManager) {
        this.emotionManager = emotionManager;
        this.selectedStorage = 'local';
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

    checkLocalConfig() {
        const settings = this.emotionManager.dataManager.settings;
        return settings && settings.localPath && settings.localPath.trim() !== '';
    }

    checkCloudConfig() {
        const settings = this.emotionManager.dataManager.settings;
        if (!settings) return false;
        
        const provider = settings.cloudProvider;
        if (!provider) return false;
        
        if (provider === 'utools') {
            return true;
        } else if (provider === 'imgbb') {
            return settings.cloudConfig && settings.cloudConfig.imgbbApiKey && settings.cloudConfig.imgbbApiKey.trim() !== '';
        } else if (provider === 'smms') {
            return settings.cloudConfig && settings.cloudConfig.smmsToken && settings.cloudConfig.smmsToken.trim() !== '';
        } else if (provider === 's3' || provider === 'github') {
            return settings.cloudConfig && 
                   settings.cloudConfig.s3Endpoint && 
                   settings.cloudConfig.s3AccessKey && 
                   settings.cloudConfig.s3SecretKey && 
                   settings.cloudConfig.s3Bucket;
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

    async selectLocalFolder() {
        try {
            if (typeof utools !== 'undefined' && utools.showOpenDialog) {
                try {
                    const result = await utools.showOpenDialog({
                        properties: ['openDirectory', 'createDirectory']
                    });
                    if (Array.isArray(result) && result.length > 0) {
                        const folderPath = result[0];
                        document.getElementById('localPath').value = folderPath;
                        this.emotionManager.dataManager.settings.localPath = folderPath;
                        this.emotionManager.showMessage('本地存储路径已选择，请点击保存设置', 'info');
                        return;
                    }
                } catch (apiError) {
                    console.log('uTools showOpenDialog 调用失败:', apiError);
                }
            }
            
            if (window.emotionCan && typeof window.emotionCan.selectFolder === 'function') {
                const folderPath = await window.emotionCan.selectFolder();
                if (folderPath) {
                    document.getElementById('localPath').value = folderPath;
                    this.emotionManager.dataManager.settings.localPath = folderPath;
                    this.emotionManager.showMessage('本地存储路径已设置，请点击保存设置', 'info');
                    return;
                }
            }
            
            if (window.emotionCan && typeof window.emotionCan.getDefaultDir === 'function') {
                const defaultDir = window.emotionCan.getDefaultDir();
                document.getElementById('localPath').value = defaultDir;
                this.emotionManager.dataManager.settings.localPath = defaultDir;
                this.emotionManager.showMessage('已使用默认存储路径，请点击保存设置', 'info');
            } else {
                this.emotionManager.showMessage('请在输入框中手动输入本地存储路径', 'info');
            }
        } catch (error) {
            console.error('选择文件夹失败:', error);
            try {
                if (window.emotionCan && window.emotionCan.getDefaultDir) {
                    const defaultDir = window.emotionCan.getDefaultDir();
                    document.getElementById('localPath').value = defaultDir;
                    this.emotionManager.dataManager.settings.localPath = defaultDir;
                }
            } catch (e) {
                console.log('设置默认路径失败');
            }
            this.emotionManager.showMessage('选择文件夹功能暂时不可用，请手动输入路径', 'info');
        }
    }

    async saveToLocal(file) {
        const settings = this.emotionManager.dataManager.settings;
        if (!settings.localPath) {
            throw new Error('请先在设置中配置本地存储路径');
        }
        
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fullPath = `${settings.localPath}/${fileName}`;
        
        if (window.emotionCan && typeof window.emotionCan.saveFile === 'function') {
            try {
                const base64 = await this.fileToBase64(file);
                const savedPath = await window.emotionCan.saveFile(base64, fullPath);
                const fileUrl = `file://${savedPath.replace(/\\/g, '/')}`;
                return fileUrl;
            } catch (error) {
                console.error('保存到本地失败:', error);
                throw new Error('保存文件到本地失败: ' + error.message);
            }
        } else {
            return URL.createObjectURL(file);
        }
    }

    async uploadToCloud(file) {
        const provider = this.emotionManager.dataManager.settings.cloudProvider;
        
        if (provider === 'utools') {
            return await this.uploadToUtools(file);
        } else if (provider === 'imgbb') {
            return await this.uploadToImgbb(file);
        } else if (provider === 'smms') {
            return await this.uploadToSmms(file);
        } else {
            throw new Error('请先配置云存储');
        }
    }

    async uploadToUtools(file) {
        try {
            console.log('开始上传到 uTools 存储');
            
            if (typeof utools === 'undefined') {
                throw new Error('非 uTools 环境，无法使用 uTools 存储');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            const base64Data = await this.fileToBase64(file);
            
            const fileId = `utools_file_${fileName}`;
            await utools.db.put({
                _id: fileId,
                fileName: fileName,
                fileType: file.type,
                fileSize: file.size,
                data: base64Data,
                uploadTime: new Date().toISOString()
            });
            
            console.log('文件上传到 uTools 存储成功:', fileName);
            
            return `utools://${fileId}`;
        } catch (error) {
            console.error('上传到 uTools 存储失败:', error);
            throw new Error('上传到 uTools 存储失败: ' + error.message);
        }
    }

    async uploadToImgbb(file) {
        const apiKey = this.emotionManager.dataManager.settings.cloudConfig.imgbbApiKey;
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

    async uploadToSmms(file) {
        const token = this.emotionManager.dataManager.settings.cloudConfig.smmsToken;
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

    async downloadAndSaveToLocal(imageUrl) {
        const settings = this.emotionManager.dataManager.settings;
        if (!settings.localPath) {
            throw new Error('请先在设置中配置本地存储路径');
        }
        
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error('下载图片失败');
            }
            
            const blob = await response.blob();
            
            const mimeType = blob.type || 'image/png';
            const extension = this.getExtensionFromMimeType(mimeType);
            
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
            const fullPath = `${settings.localPath}/${fileName}`;
            
            const base64 = await this.blobToBase64(blob);
            
            if (window.emotionCan && typeof window.emotionCan.saveFile === 'function') {
                const savedPath = await window.emotionCan.saveFile(base64, fullPath);
                const fileUrl = `file://${savedPath.replace(/\\/g, '/')}`;
                return fileUrl;
            } else {
                return URL.createObjectURL(blob);
            }
        } catch (error) {
            console.error('下载并保存到本地失败:', error);
            throw new Error('下载并保存图片失败: ' + error.message);
        }
    }
    
    getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/bmp': 'bmp',
            'image/svg+xml': 'svg'
        };
        return mimeToExt[mimeType] || 'png';
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getImageSrc(emotion) {
        if (emotion.url && emotion.url.startsWith('utools://')) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSI+57qn5LmGPC90ZXh0Pjwvc3ZnPg==';
        }
        return emotion.url;
    }

    async loadUtoolsImage(emotion, imgElement) {
        try {
            if (emotion.url && emotion.url.startsWith('utools://')) {
                const fileId = emotion.url.replace('utools://', '');
                const fileData = await utools.db.get(fileId);
                
                if (fileData && fileData.data) {
                    imgElement.src = fileData.data;
                }
            }
        } catch (error) {
            console.error('加载 uTools 图片失败:', error);
        }
    }
}
