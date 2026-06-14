# 表情罐头 - 项目架构文档

## 📌 项目概述

表情罐头是一个 uTools 平台的表情包管理插件，支持本地、云端混合存储，多源聚合搜索，以及 WebDAV/Git 同步功能。

- **作者**：抹露茶柒
- **版本**：1.1.0
- **主页**：https://sticker.moruteaven.com/
- **文档**：https://sticker.moruteaven.com/guide/

---

## 🏗️ 项目结构

```
表情罐头/
├── index.html              # 主页面，包含所有视图和模态框
├── styles.css              # 全局样式，CSS变量主题系统
├── plugin.json             # uTools 插件配置
├── preload.js              # Node.js 预加载脚本，暴露 emotionCan API
├── script.js               # 入口脚本，初始化环境和 EmotionManager
├── emotion-manager.js      # 核心控制器，协调所有模块
├── data-manager.js         # 数据持久化管理（uTools db/dbStorage）
├── storage-manager.js      # 存储管理（本地文件、S3/ImgBB/图仓上传）
├── search-manager.js       # 聚合搜索（遇见、糖豆子、百度、搜狗、接口盒子）
├── ui-manager.js           # UI管理（视图切换、模态框、统计更新）
├── theme-manager.js        # 主题管理（深色/浅色/跟随系统）
├── changelog-manager.js    # 更新记录渲染
├── logo.png                # 插件图标
└── lib/
    └── materialdesignicons.min.css  # MDI 图标库本地文件
```

---

## 🏗️ 模块架构

### 类关系图

```
EmotionManager (核心控制器)
├── DataManager      # 数据持久化
├── StorageManager   # 文件存储与上传
├── SearchManager    # 聚合搜索
├── UIManager        # UI 交互
└── ThemeManager     # 主题切换
```

### 数据流

```
用户操作 → EmotionManager → 各子模块 → uTools db/dbStorage → 持久化
                                      → preload.js (Node.js) → 文件系统/网络请求
                                      → DOM 更新 → 用户界面
```

---

## 📊 存储架构

### 双轨存储策略

项目使用 uTools 的两种存储 API 实现差异化同步：

| 存储类型 | API | Key 格式 | 同步行为 |
|---------|-----|---------|---------|
| 本地表情 | `utools.dbStorage` | `{nativeId}/emotions_local` | **不同步**，仅本设备 |
| 云端表情 | `utools.db.promises` | `emotions_cloud` | **自动同步**到同账号设备 |
| 设置 | `utools.db.promises` | `settings` | 自动同步 |

**关键设计**：本地表情使用 `utools.dbStorage` + 设备 ID 前缀，确保数据仅与当前设备绑定，不会跨设备同步。

### 数据结构

```javascript
// 表情包数据结构
{
  id: string,              // UUID v4
  url: string,             // 访问地址（file:// 或 https://）
  storageType: 'local' | 'cloud',
  tags: string[],          // 标签列表
  createdAt: string,       // ISO8601
  updatedAt: string,       // ISO8601
  metadata?: {
    originalName?: string,
    size?: number,
    originalCloudUrl?: string,   // 云端转本地时记录原始URL
    originalLocalPath?: string   // 本地转云端时记录原始路径
  }
}

// 设置数据结构
{
  cloudProvider: 'imgbb' | 'tucang' | 's3',
  localPath: string,
  themePreference?: 'system' | 'dark' | 'light',
  deleteLocalFile: boolean,      // 删除表情时是否同时删除本地文件
  cloudConfig: {
    imgbbApiKey?: string,
    tucangToken?: string,
    tucangFolderId?: number,
    // S3 配置
    s3Endpoint?: string,
    s3AccessKey?: string,
    s3SecretKey?: string,
    s3Bucket?: string,
    s3Region?: string
  },
  syncConfig: {
    enabled: boolean,
    provider: 'webdav' | 'git' | 'none',
    webdavUrl?: string,
    webdavUsername?: string,
    webdavPassword?: string,
    gitRemote?: string
  }
}
```

---

## 📁 功能模块详解

### 1. DataManager — 数据管理

**职责**：表情包和设置的 CRUD，旧数据迁移

**关键方法**：
- `loadData()` — 从 dbStorage 加载本地表情，从 db 加载云端表情和设置
- `saveData()` — 分别保存本地（dbStorage）和云端（db）表情包
- `saveSettings()` — 保存设置到 db
- `migrateOldData()` — 从旧版单一 `emotions` 结构迁移到 `local`/`cloud` 双轨
- `getAllEmotions()` — 合并本地和云端表情包列表

### 2. StorageManager — 存储管理

**职责**：文件的上传、下载、本地存储

**支持的云存储 Provider**：
| Provider | 类型 | 上传方式 | 配置 |
|----------|------|---------|------|
| ImgBB | 免费图床 | 浏览器 fetch | API Key |
| 图仓 (TuCang) | 免费图床 | 浏览器 fetch | Token + 可选 FolderId |
| S3 兼容 | 自建存储 | Node.js (preload.js) | Endpoint/AccessKey/SecretKey/Bucket/Region |

**关键方法**：
- `downloadImage(url)` — Node.js 优先下载（绕过 CORS），浏览器 fetch 回退
- `saveToLocal(file)` — 保存文件到本地路径
- `uploadToCloud(file)` — 根据 provider 路由到对应上传方法
- `uploadToImgbb(file)` / `uploadToTucang(file)` / `uploadToS3(file)` — 各 provider 实现
- `downloadAndSaveToLocal(url)` — 下载 URL 图片并保存到本地
- `uploadUrlToCloud(url)` — 下载 URL 图片后上传到云端
- `generateAuthHeader()` — AWS Signature V4 签名生成

**S3 上传技术要点**：
- 必须使用 Node.js `uploadToS3Node` 方式（preload.js 提供）
- 浏览器 fetch 因 CORS 限制不可用于 S3 直传
- 使用 AWS Signature V4 认证

### 3. SearchManager — 聚合搜索

**职责**：多源表情包搜索，无限滚动加载

**搜索源**：
| Tab | 数据源 | API |
|-----|--------|-----|
| 我的 | 本地数据库 | 标签匹配过滤 |
| 遇见 | yujn.cn | `api.yujn.cn/api/bbq_ss.php` |
| 糖豆子 | tangdouz.com | `api.tangdouz.com/a/biaoq.php` |
| 百度 | apihz.cn 代理 | `cn.apihz.cn/api/img/apihzbqbbaidu.php` |
| 搜狗 | apihz.cn 代理 | `cn.apihz.cn/api/img/apihzbqbsougou.php` |
| 接口盒子 | apihz.cn | `cn.apihz.cn/api/img/apihzbqb.php` |

**关键特性**：
- 每个搜索源独立维护分页状态（page、hasMore、loading）
- 支持"继续"按钮手动加载和滚动自动加载两种方式
- 搜索结果提供"本地"和"云端"两个添加按钮
- 所有请求都有 30 秒超时保护

### 4. UIManager — 界面管理

**职责**：视图切换、模态框、消息提示、表单操作

**视图系统**：
- `home` — 首页（表情网格 + 搜索）
- `local` — 本地表情专属视图
- `cloud` — 云端表情专属视图
- `search` — 聚合搜索入口
- `settings` — 设置面板（外观、本地存储、云端存储、同步、关于、更新记录）

**关键方法**：
- `switchView()` / `switchTab()` / `switchSettingsPanel()` — 视图/标签/设置面板切换
- `showModal()` / `hideModal()` — 模态框控制
- `showMessage()` — 右上角消息提示（3秒自动消失）
- `updateStats()` — 更新侧边栏统计数字

### 5. ThemeManager — 主题管理

**职责**：深色/浅色/跟随系统三种主题模式

**主题实现**：
- 使用 CSS 变量（`--bg-primary`、`--text-primary` 等）
- 通过 `document.documentElement.dataset.theme` 切换 `dark`/`light`
- 监听系统 `prefers-color-scheme` 变化自动切换

**偏好存储**：`localStorage.theme_preference`

### 6. EmotionManager — 核心控制器

**职责**：协调所有子模块，处理业务逻辑

**关键方法**：
- `init()` — 初始化所有模块
- `handleAddEmotion()` — 处理添加表情（URL/文件 + 本地/云端）
- `addFromUrl()` / `addFromUrlLocal()` / `addFromUrlCloud()` — 不同存储方式添加
- `copyEmotionImage()` — Canvas + fetch 双方案复制到剪贴板
- `convertCurrentEmotionStorage()` — 本地↔云端互转
- `showEmotionDetail()` — 显示表情详情（支持显示配对副本）
- `saveSettingsFromForm()` — 保存设置到数据库

### 7. preload.js — Node.js 预加载

**职责**：在 uTools 的 Node.js 环境中提供底层能力

**暴露的 API** (`window.emotionCan`)：
- `selectFolder()` — 多方式选择文件夹
- `saveFile(data, path)` — 保存文件（支持 base64）
- `fileExists(path)` / `deleteFile(path)` — 文件操作
- `getDefaultDir()` — 获取默认存储目录
- `nodeFetch(url, options)` — Node.js HTTP 请求（绕过 CORS）
- `downloadImage(url)` — Node.js 下载图片
- `uploadToS3Node(config, fileName, data, contentType)` — S3 上传

### 8. script.js — 入口文件

**职责**：环境初始化，开发环境模拟

- 检测 uTools 环境，不存在则创建模拟对象（localStorage 模拟 db）
- 创建 `EmotionManager` 实例并初始化
- 处理添加弹窗的标签页切换（URL/文件）

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
│                  EmotionManager                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │
│  │ Data     │ │ Storage  │ │ Search   │ │ UI    │  │
│  │ Manager  │ │ Manager  │ │ Manager  │ │Manager│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘  │
└───────┼────────────┼────────────┼────────────┼───────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────┐
│                   数据存储层                        │
│  ┌────────────────────────────────────────────────┐ │
│  │  utools.dbStorage (本地，不同步)               │ │
│  │  - {nativeId}/emotions_local: 本地表情包       │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │  utools.db (自动同步)                          │ │
│  │  - emotions_cloud: 云端表情包                   │ │
│  │  - settings: 用户设置                          │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
        │            │
        ▼            ▼
┌─────────────────┐  ┌─────────────────────────────────┐
│   云存储服务     │  │         Node.js 层              │
│  ┌───────────┐  │  │  ┌───────────────────────────┐  │
│  │  ImgBB    │  │  │  │  preload.js               │  │
│  │  图仓     │  │  │  │  - nodeFetch (HTTP请求)    │  │
│  │  S3       │  │  │  │  - downloadImage           │  │
│  └───────────┘  │  │  │  - uploadToS3Node          │  │
└─────────────────┘  │  │  - saveFile/deleteFile     │  │
                     │  └───────────────────────────┘  │
                     └─────────────────────────────────┘
```

---

## 🎨 UI/主题系统

### 主题模式

| 模式 | 说明 | CSS 选择器 |
|------|------|-----------|
| 深色主题 | 默认，黑色背景 | `:root[data-theme="dark"]` |
| 浅色主题 | 白色背景 | `:root[data-theme="light"]` |
| 跟随系统 | 自动检测 | 通过 `matchMedia` 动态切换 |

### CSS 变量系统

```css
:root[data-theme="dark"] {
    --bg-primary: #000000;
    --bg-secondary: #1a1a1a;
    --bg-tertiary: #333333;
    --text-primary: #ffffff;
    --text-secondary: #888888;
    --text-muted: #555555;
    --border-color: #333333;
    --accent-color: #ffffff;
    --inverse-text: #000000;
    --hover-bg: #1a1a1a;
    --card-bg: #1a1a1a;
    --input-bg: #000000;
}

:root[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-tertiary: #e0e0e0;
    --text-primary: #000000;
    --text-secondary: #666666;
    --text-muted: #999999;
    --border-color: #e0e0e0;
    --accent-color: #000000;
    --inverse-text: #ffffff;
    --hover-bg: #f0f0f0;
    --card-bg: #ffffff;
    --input-bg: #ffffff;
}
```

### 图标规范

**必须使用 Material Design Icons (MDI)**，禁止使用 Emoji 作为主要图标。

引入方式（本地文件）：
```html
<link href="lib/materialdesignicons.min.css" rel="stylesheet">
```

常用图标对照：

| 功能 | MDI 类名 |
|------|---------|
| 首页 | `mdi mdi-home` |
| 搜索 | `mdi mdi-magnify` |
| 云端 | `mdi mdi-cloud` |
| 本地 | `mdi mdi-folder` |
| 添加 | `mdi mdi-plus` |
| 设置 | `mdi mdi-cog` |
| 标签 | `mdi mdi-tag` |
| 复制 | `mdi mdi-content-copy` |
| 删除 | `mdi mdi-delete` |
| 上传 | `mdi mdi-upload` |
| 编辑 | `mdi mdi-pencil` |
| 同步 | `mdi mdi-sync` |
| 保存 | `mdi mdi-content-save` |
| 关闭 | `mdi mdi-close` |
| 成功 | `mdi mdi-check` |
| 错误 | `mdi mdi-alert-circle` |
| 提示 | `mdi mdi-lightbulb` |
| 警告 | `mdi mdi-alert` |
| 连接 | `mdi mdi-link-variant` |

---

## 🔗 外部链接处理

uTools 插件环境中普通 `<a>` 标签无法跳转，需使用 `data-external-link` 属性 + JavaScript 统一处理：

```html
<a href="https://example.com" data-external-link="true">链接</a>
```

```javascript
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

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JavaScript (ES6 Class) |
| 存储 | uTools db (同步) + dbStorage (本地) |
| Node.js | preload.js (fs, path, os, http, https) |
| 图标 | Material Design Icons (本地文件) |
| 主题 | CSS Variables + `data-theme` 属性 |

---

## 📋 开发计划

### Phase 1 — 基础功能 ✅ 已完成
- [x] 表情包列表展示（网格布局）
- [x] 标签管理（添加/编辑/删除）
- [x] URL 添加表情包
- [x] 剪贴板复制（Canvas + fetch 双方案）
- [x] S3 配置界面

### Phase 2 — 混合存储 ✅ 已完成
- [x] 本地文件存储（复制到本地文件夹）
- [x] 云端上传（ImgBB、图仓、S3）
- [x] 存储位置选择（添加时选择本地/云端）
- [x] 本地/云端区分显示（图标标识）
- [x] 本地↔云端互转
- [x] 删除时可选同时删除本地文件

### Phase 3 — 搜索功能 ✅ 已完成
- [x] 多源聚合搜索（遇见、糖豆子、百度、搜狗、接口盒子）
- [x] 无限滚动/分页加载
- [x] 搜索结果一键添加到本地或云端

### Phase 4 — 主题与 UI ✅ 已完成
- [x] 深色/浅色/跟随系统主题
- [x] CSS 变量主题系统
- [x] 侧边栏折叠
- [x] 更新记录展示
- [x] 关于页面

### Phase 5 — 增强功能 🔜 计划中
- [ ] 分类管理（多级分类）
- [ ] 拖拽上传
- [ ] 批量操作
- [ ] WebDAV/Git 同步功能完善
- [ ] 首次使用引导
- [ ] 快捷键支持
- [ ] 右键菜单

---

## 📝 开发注意事项

1. **本地路径兼容性**：Windows 路径使用反斜杠，需在 URL 中转为正斜杠
2. **URL 编码**：文件名需要正确编码，避免特殊字符问题
3. **CORS 限制**：S3 上传必须通过 preload.js 的 Node.js 方式
4. **大文件处理**：大图片需考虑压缩或分片上传
5. **同步冲突**：uTools db 自带版本控制（`_rev`），冲突时需处理
6. **设备隔离**：本地表情使用 `utools.dbStorage` + 设备 ID，确保不跨设备同步
7. **图标统一**：全项目统一使用 MDI 图标，禁止混用 Emoji
8. **外部链接**：所有外部链接必须添加 `data-external-link="true"` 属性
9. **超时处理**：所有网络请求应有 30 秒超时保护
10. **主题适配**：所有新增 UI 必须适配深色/浅色两种主题

---

## 📚 uTools API 参考

### 数据库

```javascript
// 同步存储（不会跨设备同步）
utools.dbStorage.setItem(key, value);
utools.dbStorage.getItem(key);

// 自动同步存储
await utools.db.promises.get(key);    // 读取
await utools.db.promises.put(doc);    // 写入（需包含 _id 和 _rev）
await utools.db.promises.remove(key); // 删除
```

### 系统

```javascript
utools.copyImage(dataUrl);           // 复制图片到剪贴板
utools.shellOpenExternal(url);       // 打开外部链接
utools.showOpenDialog(options);      // 文件/文件夹选择对话框
utools.getUser();                    // 获取当前用户信息
utools.getNativeId();                // 获取设备 ID
```

### 插件配置 (plugin.json)

```json
{
  "pluginName": "表情罐头",
  "main": "index.html",
  "preload": "preload.js",
  "logo": "logo.png",
  "platform": ["win32", "darwin", "linux"],
  "permissions": ["db", "shell", "clipboard", "fileSystem"],
  "features": [{
    "code": "表情罐头",
    "cmds": ["表情包", "表情", "表情罐头"]
  }]
}
```

---

> **文档维护规则**：如果增加了新功能或修改了架构，请同步更新本文档。
