# 表情罐头 - 项目架构文档

## 📌 项目概述

表情罐头是一个uTools平台的表情包管理插件，支持本地、云端混合存储，以及WebDAV/Git同步功能。

---

## 🏗️ 存储架构

### 混合存储模式（Hybrid）

表情罐头采用**混合存储模式**，同时支持本地和云端存储：

| 存储位置 | 同步支持 | 说明 |
|---------|---------|------|
| 本地磁盘 | ❌ 不同步 | 仅本机使用，适合隐私敏感内容 |
| 云端URL | ✅ 支持同步 | 可跨设备同步，适合常用表情包 |

### 数据结构

```javascript
// 表情包数据结构
{
  id: string,              // 唯一标识符 (UUID)
  url: string,             // 访问地址（本地路径或云端URL）
  storageType: 'local' | 'cloud',  // 存储类型：local=本地不参与同步，cloud=云端参与同步
  tags: string[],          // 标签列表
  category?: string,       // 分类ID
  createdAt: string,       // 创建时间 ISO8601
  updatedAt: string,       // 更新时间 ISO8601
  metadata?: {             // 元数据（可选）
    originalName?: string, // 原始文件名
    size?: number,         // 文件大小
    width?: number,        // 图片宽度
    height?: number        // 图片高度
  }
}

// 设置数据结构
{
  cloudProvider: 's3' | 'github' | 'imgbb' | 'smms' | 'custom',
  localPath: string,       // 本地存储路径
  cloudConfig: {
    // S3配置
    s3Endpoint?: string,
    s3AccessKey?: string,
    s3SecretKey?: string,
    s3Bucket?: string,
    s3Region?: string,
    // GitHub配置
    githubToken?: string,
    githubRepo?: string,
    githubPath?: string,
    // 第三方图床
    imgbbApiKey?: string,
    smmsToken?: string
  },
  syncConfig: {
    enabled: boolean,
    provider: 'webdav' | 'git',
    webdavUrl?: string,
    webdavUsername?: string,
    webdavPassword?: string,
    gitRemote?: string
  }
}
```

---

## 📁 功能模块

### 1. 存储管理模块

#### 1.1 本地存储
- 用户指定本地文件夹作为存储根目录
- 图片按分类或时间组织子文件夹
- 支持拖拽上传本地图片
- **注意**：本地存储的表情包**不会**同步到其他设备

#### 1.2 云端存储
支持多种云存储 provider：

**S3兼容存储**
- 需配置：Endpoint、AccessKey、SecretKey、Bucket、Region
- 支持：AWS S3、七牛云、腾讯COS、阿里OSS等S3兼容服务

**GitHub + CDN**
- 需配置：Personal Access Token、仓库、路径
- 使用jsDelivr或GitHub原生CDN加速

**第三方图床API**
- ImgBB（免费，无需服务器）
- SM.MS（免费，无需服务器）
- 自定义API

#### 1.3 混合存储
- 用户可同时使用本地和云端
- 存储时选择存储位置
- 界面清晰区分本地/云端表情包
- 同步时**仅同步云端记录**

### 2. 同步模块

> **重要**：同步功能**仅同步云端存储的表情包**，本地存储的表情包不会同步。

#### 2.1 WebDAV同步
- 支持坚果云、NextCloud等标准WebDAV服务
- 同步数据库JSON文件
- 增量同步，只同步变化部分

#### 2.2 Git同步
- 导出数据库为JSON文件
- 推送到Git仓库
- 适合自建Git服务器或GitHub私有仓库

#### 2.3 同步策略

```javascript
// 同步时的处理逻辑
function syncData() {
  const cloudItems = emotions.filter(e => e.storageType === 'cloud');
  const localItems = emotions.filter(e => e.storageType === 'local');

  // 只同步云端记录
  syncToRemote(cloudItems);

  // 本地记录提示用户
  if (localItems.length > 0) {
    showWarning(`有 ${localItems.length} 个本地表情包未同步，这些不会同步到其他设备`);
  }
}
```

### 3. 添加表情包

#### 3.1 添加方式
- **URL添加**：直接输入网络图片URL
- **本地上传**：选择本地图片，根据模式存储到本地或云端
- **聚合搜索**：从互联网搜索表情包并转存
- **拖拽添加**：拖拽图片到窗口自动处理

#### 3.2 添加流程

```
用户添加表情包
    │
    ├─→ 输入URL
    │   └─→ 验证URL有效性
    │       ├─→ 存储为URL记录
    │       └─→ 用户选择是否下载到本地
    │
    ├─→ 本地上传
    │   ├─→ 本地模式 → 复制到本地文件夹
    │   ├─→ 云端模式 → 上传到图床获得URL
    │   └─→ 混合模式 → 用户选择存储位置
    │
    └─→ 聚合搜索
        └─→ 选择表情包
            ├─→ 下载到本地 → 复制到本地文件夹
            └─→ 转存到云端 → 上传到图床
```

### 4. 分类与标签管理

#### 4.1 分类系统
- 支持多级分类（树形结构）
- 每个表情包属于一个分类
- 支持创建、编辑、删除分类

#### 4.2 标签系统
- 每个表情包可有多个标签
- 支持添加、编辑、删除标签
- 支持按标签搜索和过滤

### 5. 聚合搜索

#### 5.1 集成接口
- **表情包搜搜**：http://www.qqtouxiangzhao.com/
- **发表情**：https://www.fabiaoqing.com/
- **斗图啦**：https://www.doutula.com/

#### 5.2 搜索流程
1. 用户输入关键词
2. 调用搜索接口获取结果
3. 展示搜索结果列表
4. 用户选择表情包
5. 转存到自己的库（本地或云端）

### 6. 用户界面

#### 6.1 主要视图
- **首页**：表情包网格展示
- **搜索**：聚合搜索入口
- **分类**：按分类浏览
- **设置**：存储配置、同步配置

#### 6.2 操作
- 双击表情包：快速复制到剪贴板
- 右键菜单：复制、编辑标签、移动分类、删除
- 拖拽排序：调整表情包顺序

---

## 🔄 数据流

```
┌─────────────────────────────────────────────────────┐
│                     用户界面                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐              │
│  │  添加   │  │  浏览   │  │  搜索   │              │
│  └────┬────┘  └────┬────┘  └────┬────┘              │
│       │            │            │                   │
└───────┼────────────┼────────────┼───────────────────┘
        │            │            │
        ▼            ▼            ▼
┌─────────────────────────────────────────────────────┐
│                   业务逻辑层                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ 存储   │  │ 同步   │  │ 分类   │  │ 搜索   │ │
│  │ 管理   │  │ 管理   │  │ 管理   │  │ 管理   │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │
└───────┼────────────┼────────────┼────────────┼─────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────┐
│                   数据存储层                        │
│  ┌────────────────────────────────────────────────┐ │
│  │              uTools 本地数据库                  │ │
│  │  - emotions: 表情包列表                         │ │
│  │  - settings: 用户设置                           │ │
│  │  - categories: 分类列表                          │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
        │            │
        ▼            ▼
┌─────────────────┐  ┌─────────────────────────────────┐
│   云存储服务     │  │         远程同步服务            │
│  ┌───────────┐  │  │  ┌───────────┐  ┌───────────┐  │
│  │   S3      │  │  │  │  WebDAV   │  │   Git     │  │
│  │  GitHub   │  │  │  │ 坚果云    │  │  GitHub   │  │
│  │  图床API  │  │  │  │ NextCloud │  │  自建Git  │  │
│  └───────────┘  │  │  └───────────┘  └───────────┘  │
└─────────────────┘  └─────────────────────────────────┘
```

---

## 📋 开发计划

### Phase 1 - 基础功能 ✅ 已完成部分
- [x] 表情包列表展示
- [x] 标签管理
- [x] URL添加表情包
- [x] 剪贴板复制
- [x] S3配置界面

### Phase 2 - 混合存储实现
- [ ] 本地文件存储（复制到本地文件夹）
- [ ] 云端上传（多种图床支持）
- [ ] 存储位置选择（添加时选择本地/云端）
- [ ] 本地/云端区分显示

### Phase 3 - 同步功能
- [ ] WebDAV同步
- [ ] Git同步
- [ ] 同步状态管理
- [ ] 仅同步云端记录的实现

### Phase 4 - 增强功能
- [ ] 分类管理
- [ ] 聚合搜索
- [ ] 拖拽上传
- [ ] 批量操作

### Phase 5 - 用户体验
- [ ] 首次使用引导
- [ ] 快捷键支持
- [ ] 右键菜单
- [ ] 导入/导出功能

---

## 🛠️ 技术栈

- **前端**：原生HTML/CSS/JavaScript
- **存储**：uTools db API
- **上传**：fetch API、Web API
- **同步**：WebDAV客户端库、Git操作库
- **图标库**：Material Design Icons (MDI)

---

## 🎨 UI/图标规范

### 图标库选择

**必须使用 Material Design Icons (MDI) 图标库，避免使用 Emoji 作为主要图标**

原因：
- MDI图标风格统一，视觉效果专业
- 支持多种粗细和尺寸
- 适合暗色主题
- 保持界面专业性

### 引入方式

```html
<head>
  <!-- Material Design Icons -->
  <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css" rel="stylesheet">
</head>
```

### 图标使用示例

```html
<!-- MDI图标使用格式：mdi mdi-[图标名] -->
<i class="mdi mdi-home"></i> 首页
<i class="mdi mdi-magnify"></i> 搜索
<i class="mdi mdi-cloud"></i> 云端
<i class="mdi mdi-folder"></i> 本地
<i class="mdi mdi-plus"></i> 添加
<i class="mdi mdi-cog"></i> 设置
```

### 常用图标对照表

| 功能 | Emoji ❌ | MDI图标 ✅ |
|------|---------|-----------|
| 首页 | 🏠 | `mdi mdi-home` |
| 搜索 | 🔍 | `mdi mdi-magnify` |
| 云端 | ☁️ | `mdi mdi-cloud` |
| 本地 | 💾 | `mdi mdi-folder` |
| 添加 | ➕ | `mdi mdi-plus` |
| 设置 | ⚙️ | `mdi mdi-cog` |
| 标签 | 🏷️ | `mdi mdi-tag` |
| 复制 | 📋 | `mdi mdi-content-copy` |
| 删除 | 🗑️ | `mdi mdi-delete` |
| 上传 | 📤 | `mdi mdi-upload` |
| 编辑 | ✏️ | `mdi mdi-pencil` |
| 同步 | 🔄 | `mdi mdi-sync` |
| 保存 | 💾 | `mdi mdi-content-save` |
| 关闭 | ✖️ | `mdi mdi-close` |
| 成功 | ✅ | `mdi mdi-check` |
| 错误 | ❌ | `mdi mdi-alert-circle` |
| 提示 | 💡 | `mdi mdi-lightbulb` |
| 警告 | ⚠️ | `mdi mdi-alert` |
| 连接 | 🔗 | `mdi mdi-link-variant` |

### 注意事项

1. **保持一致性**：整个项目统一使用MDI图标风格
2. **暗色主题适配**：MDI图标默认是白色，适配深色背景
3. **尺寸统一**：设置统一的图标大小，便于布局
4. **避免混用**：不要在同一个界面上同时使用Emoji和MDI图标

### MDI图标资源

- 官方文档：https://materialdesignicons.com/
- CDN引入：https://cdn.jsdelivr.net/npm/@mdi/font

---

## 🎨 主题系统

### 主题模式

插件支持**三种主题模式**：

| 模式 | 说明 | 优先级 |
|------|------|--------|
| **浅色主题** | 白色背景，深色文字 | 最高 |
| **深色主题** | 黑色背景，浅色文字 | 中 |
| **跟随系统** | 自动检测系统主题设置 | 最低 |

### 主题优先级

```
用户手动切换 > 系统主题检测 > 默认深色主题
```

### CSS变量系统

使用CSS变量定义主题颜色，便于统一管理和切换：

```css
:root {
    /* 深色主题（默认） */
    --bg-primary: #000000;
    --bg-secondary: #1a1a1a;
    --text-primary: #ffffff;
    --text-secondary: #888888;
    --border-color: #333333;
    --accent-color: #ffffff;
}

:root[data-theme="light"] {
    /* 浅色主题 */
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #e0e0e0;
    --accent-color: #000000;
}
```

### 深色主题配色方案

```css
:root {
    --bg-primary: #000000;
    --bg-secondary: #1a1a1a;
    --text-primary: #ffffff;
    --text-secondary: #888888;
    --border-color: #333333;
    --accent-color: #ffffff;
    --hover-bg: #1a1a1a;
    --card-bg: #1a1a1a;
}
```

### 浅色主题配色方案

```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #e0e0e0;
    --accent-color: #000000;
    --hover-bg: #f0f0f0;
    --card-bg: #ffffff;
}
```

### 主题切换实现

```javascript
class ThemeManager {
    constructor() {
        this.THEME_KEY = 'theme_preference';
        this.THEMES = {
            light: '浅色主题',
            dark: '深色主题',
            system: '跟随系统'
        };
    }

    // 获取用户主题偏好
    getUserPreference() {
        const saved = localStorage.getItem(this.THEME_KEY);
        return saved || 'system';
    }

    // 保存用户主题偏好
    setUserPreference(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
        this.applyTheme(theme);
    }

    // 应用主题
    applyTheme(preference) {
        if (preference === 'system') {
            // 检测系统主题
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        } else {
            document.documentElement.dataset.theme = preference;
        }
    }

    // 监听系统主题变化
    setupSystemThemeListener() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.getUserPreference() === 'system') {
                this.applyTheme('system');
            }
        });
    }
}
```

### 主题切换UI设计

在设置页面添加主题切换选项：

```html
<div class="settings-section">
    <h3>外观设置</h3>
    <div class="form-group">
        <label>主题模式</label>
        <select id="themeSelect" class="form-select">
            <option value="system">跟随系统</option>
            <option value="dark">深色主题</option>
            <option value="light">浅色主题</option>
        </select>
    </div>
</div>
```

### 深色主题样式清单

需要适配深色主题的元素：

| 元素 | 深色主题 | 浅色主题 |
|------|---------|---------|
| 背景 | `#000000` | `#ffffff` |
| 次级背景 | `#1a1a1a` | `#f5f5f5` |
| 文字 | `#ffffff` | `#000000` |
| 次级文字 | `#888888` | `#666666` |
| 边框 | `#333333` | `#e0e0e0` |
| 卡片背景 | `#1a1a1a` | `#ffffff` |
| 按钮文字 | `#000000` | `#ffffff` |
| 按钮边框 | `#ffffff` | `#000000` |
| 输入框背景 | `#000000` | `#ffffff` |
| 输入框边框 | `#333333` | `#e0e0e0` |

### 注意事项

1. **性能优化**：主题切换应使用CSS变量，避免重复渲染
2. **平滑过渡**：添加主题切换动画效果
3. **图标适配**：MDI图标在深色主题下默认为白色，浅色主题下需要调整
4. **图片显示**：表情包图片在浅色主题下需确保可见性
5. **对比度**：确保文字和背景有足够的对比度，符合WCAG标准

### 媒体查询辅助

```css
@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
        /* 深色主题样式 */
    }
}

@media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
        /* 浅色主题样式 */
    }
}
```

---

## 🔗 外部链接处理规范

### 问题背景

uTools 插件环境中，普通的 `<a>` 标签链接无法正常跳转，需要使用 uTools API 来打开外部链接。

### 统一处理方式

项目采用 `data-external-link` 属性 + JavaScript 统一处理的方式：

### 1. HTML 写法

```html
<!-- 普通文本链接 -->
<a href="https://example.com" data-external-link="true">访问网站</a>

<!-- 带样式的链接 -->
<a href="https://example.com" class="about-link" data-external-link="true">
    <i class="mdi mdi-link-variant"></i>
    <span>官方链接</span>
</a>
```

### 2. JavaScript 处理逻辑

在 emotion-manager.js 中统一处理：

```javascript
// 处理外部链接点击事件
document.querySelectorAll('[data-external-link="true"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('href');
        if (typeof utools !== 'undefined' && utools.shellOpenExternal) {
            utools.shellOpenExternal(url);
        } else {
            window.open(url, '_blank');
        }
    });
});
```

### 3. CSS 样式

```css
/* 普通链接样式 */
a[data-external-link="true"] {
    color: var(--accent-color);
    text-decoration: underline;
    cursor: pointer;
}

a[data-external-link="true"]:hover {
    opacity: 0.7;
}

/* 图标按钮样式（用于 about 页面等） */
a.about-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: 2px solid var(--accent-color);
    border-radius: 10px;
    color: var(--text-primary);
    text-decoration: none;
    transition: all 0.3s ease;
}

a.about-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
```

### 注意事项

1. **不要使用 `target="_blank"`**：uTools 环境不支持
2. **不要用按钮 + onclick**：统一使用 `<a>` + `data-external-link` 属性方式
3. **统一处理**：所有外部链接都要添加 `data-external-link="true"` 属性，由 JavaScript 统一拦截处理
4. **备用方案**：代码中保留了 `window.open()` 作为 fallback，确保开发环境也能正常测试

---

## 📚 uTools API 参考

### 数据库 API

uTools 提供本地数据库存储，支持键值对存储：

```javascript
// 存储数据
await utools.db.put({
  _id: 'key_name',    // 唯一键名
  data: {}            // 存储的数据（可以是任意类型）
});

// 读取数据
const result = await utools.db.get('key_name');
// 返回: { _id: 'key_name', data: {...} }
// 如果不存在返回 null

// 删除数据
await utools.db.remove('key_name');

// 遍历所有数据（需要插件配置storage权限）
const allDocs = await utools.db.allDocs();
```

### 剪贴板 API

```javascript
// 复制文本到剪贴板
utools.copyText('要复制的文本');

// 复制图片到剪贴板（通过fetch下载后复制）
const response = await fetch(imageUrl);
const blob = await response.blob();
await navigator.clipboard.write([
  new ClipboardItem({ [blob.type]: blob })
]);

// 读取剪贴板文本
const text = await navigator.clipboard.readText();
```

### 文件操作

```javascript
// 打开文件选择对话框
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.onchange = (e) => {
  const file = e.target.files[0];
  // 处理文件...
};

// 或使用 utools 的原生能力（Node.js环境）
// 在 preload.js 中可以调用 node_modules
```

### 窗口操作

```javascript
// 隐藏插件窗口
utools.hideMainWindow();

// 显示插件窗口
utools.showMainWindow();

// 退出插件
utools.outPlugin();

// 窗口尺寸
utools.getNativeImageSize(imageUrl).then(size => {
  console.log(size.width, size.height);
});
```

### 常用工具函数

```javascript
// 显示提示消息（系统通知）
utools.showNotification('消息内容');

// 创建子进程
const { exec } = require('child_process');
exec('some command');

// 路径处理
const path = require('path');
// path.join(), path.resolve(), path.basename() 等

// 文件系统
const fs = require('fs');
// fs.readFileSync(), fs.writeFileSync() 等
```

### 插件配置（plugin.json）

```json
{
  "main": "index.html",        // 入口文件
  "preload": "preload.js",     // 预加载脚本（Node.js环境）
  "logo": "logo.png",          // 插件图标
  "platform": ["win32", "darwin", "linux"],  // 支持平台
  "permissions": ["storage", "fs", "shell"]  // 需要的权限
}
```

### 开发注意事项

1. **前端页面**：在 `index.html` 中编写，使用标准 Web API
2. **Node.js能力**：在 `preload.js` 中调用，需要配置 `preload` 字段
3. **权限申请**：在 `plugin.json` 中声明需要的权限
4. **本地存储**：使用 `utools.db` 存储数据，无需自己管理数据库
5. **跨域问题**：图片URL添加需要考虑CORS限制，必要时需要代理

---

## 📚 uTools 官方文档完整目录

> 以下是uTools开发者文档的完整目录结构，包含所有重要页面的链接。

### 快速入门

| 文档 | 链接 | 说明 |
|------|------|------|
| 快速开始 | [getting-started.html](https://www.u-tools.cn/docs/developer/basic/getting-started.html) | 环境要求、项目概述 |
| 第一个插件应用 | [first-plugin.html](https://www.u-tools.cn/docs/developer/basic/first-plugin.html) | 创建第一个插件的完整流程 |
| 调试插件应用 | [debug-plugin.html](https://www.u-tools.cn/docs/developer/basic/debug-plugin.html) | 开发者工具调试方法 |

### 开发指南

| 文档 | 链接 | 说明 |
|------|------|------|
| preload.js | [preload-js.html](https://www.u-tools.cn/docs/developer/information/preload-js/preload-js.html) | Node.js能力预加载脚本 |
| Node.js API | [nodejs.html](https://www.u-tools.cn/docs/developer/information/preload-js/nodejs.html) | preload中可用的Node.js模块 |
| plugin.json | [plugin-json.html](https://www.u-tools.cn/docs/developer/information/plugin-json.html) | 插件配置文件详解 |
| 文件结构 | [file-structure.html](https://www.u-tools.cn/docs/developer/information/file-structure.html) | 推荐的工程目录结构 |
| 图标 | [icon.html](https://www.u-tools.cn/docs/developer/information/icon.html) | 插件图标要求 |

### API 参考

#### 交互事件
| 文档 | 链接 | 说明 |
|------|------|------|
| 交互事件总览 | [events.html](https://www.u-tools.cn/docs/developer/api-reference/utools/events.html) | 插件生命周期事件 |
| onPluginOut | [events.html#onpluginout](https://www.u-tools.cn/docs/developer/api-reference/utools/events.html#onpluginout) | 插件退出事件 |
| onAppLeave | [events.html#onappleave](https://www.u-tools.cn/docs/developer/api-reference/utools/events.html#onappleave) | 应用离开事件 |
| onWillAppLeave | [events.html#onwillappleave](https://www.u-tools.cn/docs/developer/api-reference/utools/events.html#onwillappleave) | 应用即将离开事件 |

#### 数据存储
| 文档 | 链接 | 说明 |
|------|------|------|
| db.storage | [db-storage.html](https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html) | 本地数据库存储API |
| db.put() | [db-storage.html#put](https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html#put) | 存储数据 |
| db.get() | [db-storage.html#get](https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html#get) | 获取数据 |
| db.remove() | [db-storage.html#remove](https://www.u-tools.cn/docs/developer/api-reference/db/db-storage.html#remove) | 删除数据 |

#### 系统相关
| 文档 | 链接 | 说明 |
|------|------|------|
| 系统API总览 | [system.html](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html) | 系统级API |
| copyText | [system.html#copytext](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#copytext) | 复制文本到剪贴板 |
| copyImage | [system.html#copyimage](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#copyimage) | 复制图片 |
| pasteText | [system.html#pastetext](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#pastetext) | 读取剪贴板文本 |
| showNotification | [system.html#shownotification](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#shownotification) | 显示系统通知 |
| getCurrentWindow | [system.html#getcurrentwindow](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#getcurrentwindow) | 获取当前窗口 |
| getNativeImageSize | [system.html#getnativeimagesize](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#getnativeimagesize) | 获取图片尺寸 |
| openExternal | [system.html#openexternal](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#openexternal) | 打开外部链接 |
| shell | [system.html#shell](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#shell) | 执行系统命令 |
| showOpenDialog | [system.html#showopendialog](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#showopendialog) | 打开文件对话框 |
| showSaveDialog | [system.html#showsavedialog](https://www.u-tools.cn/docs/developer/api-reference/utools/system.html#showsavedialog) | 保存文件对话框 |

#### 窗口操作
| 文档 | 链接 | 说明 |
|------|------|------|
| hideMainWindow | [window.html#hidemainwindow](https://www.u-tools.cn/docs/developer/api-reference/window/window.html#hidemainwindow) | 隐藏主窗口 |
| showMainWindow | [window.html#showmainwindow](https://www.u-tools.cn/docs/developer/api-reference/window/window.html#showmainwindow) | 显示主窗口 |
| setExpendHeight | [window.html#setexpendheight](https://www.u-tools.cn/docs/developer/api-reference/window/window.html#setexpendheight) | 设置窗口高度 |
| moveWindow | [window.html#movewindow](https://www.u-tools.cn/docs/developer/api-reference/window/window.html#movewindow) | 移动窗口 |
| resizeWindow | [window.html#resizewindow](https://www.u-tools.cn/docs/developer/api-reference/window/window.html#resizewindow) | 调整窗口大小 |

#### 特色功能
| 文档 | 链接 | 说明 |
|------|------|------|
| 二维码 | [qrcode.html](https://www.u-tools.cn/docs/developer/api-reference/features/qrcode.html) | 识别和生成二维码 |
| 超级面板 | [super-panel.html](https://www.u-tools.cn/docs/developer/api-reference/features/super-panel.html) | 右键超级面板 |
| 全局快捷键 | [global-shortcut.html](https://www.u-tools.cn/docs/developer/api-reference/features/global-shortcut.html) | 注册全局快捷键 |
| 截图 | [screenshot.html](https://www.u-tools.cn/docs/developer/api-reference/features/screenshot.html) | 屏幕截图 |
| 窗口拾取 | [window-picker.html](https://www.u-tools.cn/docs/developer/api-reference/features/window-picker.html) | 拾取窗口信息 |
| 自动更新 | [auto-upgrade.html](https://www.u-tools.cn/docs/developer/api-reference/features/auto-upgrade.html) | 插件自动更新 |

### 资源

| 资源 | 链接 | 说明 |
|------|------|------|
| 官方文档首页 | [https://www.u-tools.cn/docs/](https://www.u-tools.cn/docs/) | 完整文档中心 |
| 开发者首页 | [developer.html](https://www.u-tools.cn/docs/developer/) | 开发者文档入口 |
| 插件市场 | [https://www.u-tools.cn/plugins/](https://www.u-tools.cn/plugins/) | 插件应用市场 |
| uTools下载 | [https://www.u.tools/download/](https://www.u.tools/download/) | 下载uTools客户端 |
| 开发者工具 | [开发者工具插件](https://www.u.tools/plugins/detail/uTools%20%E5%BC%80%E5%8F%91%E8%80%85%E5%B7%A5%E5%85%B7/) | uTools开发者工具 |

---

## 📝 注意事项

1. **本地路径兼容性**：Windows路径使用反斜杠，Mac/Linux使用正斜杠
2. **URL编码**：文件名需要正确编码，避免特殊字符问题
3. **CORS限制**：浏览器环境下直接上传到S3需要预签名URL或后端代理
4. **大文件处理**：大图片需要压缩或分片上传
5. **同步冲突**：多设备同时修改需要冲突处理策略


如果增加了新的功能需要吧需要的添加到AGENTS.md中