class DataManager {
    constructor() {
        this.emotions = [];
        this.settings = null;
    }

    async loadData() {
        try {
            console.log('===== 开始加载数据 =====');
            
            const emotionsData = await utools.db.get('emotions');
            console.log('读取到的 emotionsData:', emotionsData);
            
            const settingsData = await utools.db.get('settings');
            console.log('读取到的 settingsData:', settingsData);
            
            if (emotionsData) {
                this.emotions = emotionsData.data || [];
                console.log('加载的表情包数量:', this.emotions.length);
            }
            
            if (settingsData) {
                this.settings = settingsData.data;
                console.log('加载到的 settings:', this.settings);
            } else {
                console.log('没有找到已保存的设置，使用默认值');
                let defaultLocalPath = '';
                if (window.emotionCan && typeof window.emotionCan.getDefaultDir === 'function') {
                    defaultLocalPath = window.emotionCan.getDefaultDir();
                }
                
                this.settings = {
                    cloudProvider: 'utools',
                    localPath: defaultLocalPath,
                    cloudConfig: {},
                    syncConfig: {}
                };
                console.log('使用的默认 settings:', this.settings);
            }
            
            console.log('===== 数据加载结束 =====');
        } catch (error) {
            console.error('加载数据失败:', error);
            this.emotions = [];
            
            let defaultLocalPath = '';
            if (window.emotionCan && typeof window.emotionCan.getDefaultDir === 'function') {
                defaultLocalPath = window.emotionCan.getDefaultDir();
            }
            
            this.settings = {
                cloudProvider: 'utools',
                localPath: defaultLocalPath,
                cloudConfig: {},
                syncConfig: {}
            };
        }
    }

    async saveData() {
        try {
            console.log('===== 开始保存表情包数据 =====');
            console.log('准备保存的表情包数量:', this.emotions.length);
            console.log('准备保存的表情包:', this.emotions);
            
            try {
                await utools.db.remove('emotions');
                console.log('旧表情包数据已删除');
            } catch (e) {
                console.log('没有旧表情包数据，无需删除');
            }
            
            const result = await utools.db.put({
                _id: 'emotions',
                data: this.emotions
            });
            
            console.log('表情包数据保存成功，返回结果:', result);
            
            const verifyData = await utools.db.get('emotions');
            console.log('验证保存后读取到的表情包数据:', verifyData);
            
            console.log('===== 表情包数据保存流程结束 =====');
        } catch (error) {
            console.error('保存表情包数据失败:', error);
            throw new Error('保存失败: ' + error.message);
        }
    }

    async saveSettings() {
        try {
            console.log('===== 开始保存设置 =====');
            console.log('准备保存到数据库的 settings:', this.settings);
            
            try {
                await utools.db.remove('settings');
                console.log('旧设置已删除');
            } catch (e) {
                console.log('没有旧设置，无需删除');
            }
            
            const result = await utools.db.put({
                _id: 'settings',
                data: this.settings
            });
            
            console.log('设置保存成功，返回结果:', result);
            
            const verifyData = await utools.db.get('settings');
            console.log('验证保存后读取到的数据:', verifyData);
            
            console.log('===== 保存流程结束 =====');
        } catch (error) {
            console.error('保存设置失败:', error);
            throw new Error('保存设置失败: ' + error.message);
        }
    }

    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
