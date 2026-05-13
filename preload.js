// preload.js - uTools预加载脚本
// 此文件在插件初始化时加载，可用于Node.js环境下的操作

console.log('表情罐头插件 preload.js 已加载');

const fs = require('fs');
const path = require('path');
const os = require('os');

// 暴露必要的功能到 window 对象
window.emotionCan = {
  // 选择文件夹 - 使用多种方式兼容
  selectFolder: async function() {
    try {
      // 方式1: 直接使用 utools.showOpenDialog
      if (typeof utools !== 'undefined' && utools.showOpenDialog) {
        try {
          const result = await utools.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
          });
          if (Array.isArray(result) && result.length > 0) {
            return result[0];
          }
        } catch (e) {
          console.log('utools.showOpenDialog 失败，尝试其他方法');
        }
      }
      
      // 方式2: 尝试使用 electron remote（如果有）
      try {
        const electron = require('electron');
        if (electron && electron.remote) {
          const dialog = electron.remote.dialog;
          if (dialog) {
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory', 'createDirectory']
            });
            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
              return result.filePaths[0];
            }
          }
        }
      } catch (e) {
        console.log('electron.remote 方式失败:', e.message);
      }
      
      // 方式3: 所有方法都失败，返回默认目录
      const defaultDir = path.join(os.homedir(), '表情罐头');
      console.log('使用默认目录:', defaultDir);
      return defaultDir;
      
    } catch (error) {
      console.error('选择文件夹失败，返回默认目录:', error);
      // 出错时返回默认目录
      return path.join(os.homedir(), '表情罐头');
    }
  },

  // 保存文件到本地
  saveFile: async function(fileData, targetPath) {
    try {
      // 确保目录存在
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 如果 fileData 是 base64 格式
      if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const base64Data = fileData.replace(/^data:\w+\/\w+;base64,/, '');
        fs.writeFileSync(targetPath, base64Data, 'base64');
      } else if (fileData instanceof Buffer) {
        fs.writeFileSync(targetPath, fileData);
      } else {
        throw new Error('不支持的文件数据格式');
      }

      return targetPath;
    } catch (error) {
      console.error('保存文件失败:', error);
      throw error;
    }
  },

  // 文件是否存在
  fileExists: function(filePath) {
    return fs.existsSync(filePath);
  },

  // 获取用户默认目录
  getDefaultDir: function() {
    return path.join(os.homedir(), '表情罐头');
  }
};

console.log('表情罐头插件 API 已暴露');
