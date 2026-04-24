# YourMemo

专业的个人生产力与项目管理桌面应用，基于 Electron + React + Python FastAPI 构建。

## 技术栈

- **前端**: React 19 + TypeScript + TailwindCSS v4 + Zustand
- **桌面端**: Electron (hiddenInset titlebar, 多窗口)
- **后端**: Python FastAPI + aiosqlite (SQLite WAL 模式)
- **国际化**: i18next (中文 / English)
- **打包**: electron-builder

## 项目结构

```
├── backend/                # Python FastAPI 后端
│   ├── main.py             # 应用入口 + CORS
│   ├── db.py               # SQLite 数据库 schema + 迁移
│   ├── models/             # Pydantic 数据模型
│   ├── routers/            # API 路由 (projects, tasks)
│   └── services/           # 业务逻辑层
├── src/
│   ├── main/               # Electron 主进程
│   │   ├── index.ts        # 窗口管理 + 全局快捷键
│   │   └── pythonManager.ts # Python 后端进程管理
│   ├── preload/            # Electron preload (contextBridge)
│   └── renderer/           # React 前端
│       ├── components/     # UI 组件
│       ├── pages/          # 页面组件
│       ├── stores/         # Zustand 状态管理
│       └── utils/          # 工具函数
├── shared/                 # 前后端共享
│   ├── types.ts            # TypeScript 类型定义
│   └── i18n/               # 国际化翻译文件
└── mobile/                 # React Native 移动端 (实验性)
```

## 模块功能

### 仪表盘 (Dashboard)
- **日历视图**: 月度日历，点击日期弹出 Popover 显示当日任务，支持状态一键切换
- **时间线视图**: 7 天甘特图周视图，动态列宽自适应，支持拖拽条形右边缘调整截止日期
- **今日概览**: 顶部显示今日待办和逾期任务警示，无任务时显示空状态鼓励语

### 项目管理
- 创建项目支持名称、描述、截止日期、颜色预设、Emoji 图标
- 侧边栏项目列表，点击以右侧滑入面板形式管理任务（仪表盘始终可见）

### 任务管理
- 任务支持 5 种状态 (Backlog / Todo / In Progress / Done / Cancelled)
- 优先级 4 级 (Low / Medium / High / Urgent)，仅 Urgent 显示饱和色徽章
- 任务详情抽屉：渐进式披露（描述/链接默认折叠，有内容时展开）
- 多链接管理 + Markdown 引用一键复制 `[label](url)`

### 快速捕获 (Quick Capture)
- 全局快捷键 `Cmd+Shift+M` 唤起 Spotlight 风格输入窗口
- 自然语言解析：`明天 提交报告 /urgent #项目名`
- 支持中英文日期识别（今天/明天/周一/next monday 等）

### 主题系统
- 亮色 / 暗色主题切换
- 4 种工业风主题色预设（石墨、普鲁士蓝、深林绿、铁锈红）+ 自定义 HEX
- CSS 变量驱动，HSL 动态计算明暗变体

### 国际化
- 中文 / English 实时切换，覆盖所有 UI 文案

### 过渡动画
- Modal 弹出 scaleIn 动画，Drawer/面板 slideInRight 动画
- 背景遮罩 fadeIn 过渡，按钮点击 scale 反馈

## 部署方法

### 环境要求
- Node.js >= 18
- Python >= 3.10
- npm

### 开发环境

```bash
# 1. 安装前端依赖
npm install

# 2. 创建 Python 虚拟环境并安装后端依赖
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. 一键启动（前端 + 后端 + Electron）
npm run dev

# 或分别启动三个终端：
npm run dev:backend    # 后端 FastAPI (端口 18230)
npm run dev:renderer   # 前端 Vite (端口 5173)
npm run dev:electron   # Electron 主进程
```

### 生产打包

```bash
# 构建并打包为桌面应用
npm run pack
```

打包产物位于 `release/` 目录。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+M` | 快速捕获窗口 |
| `Enter` | 确认创建（快速捕获中） |
| `Escape` | 关闭弹窗/面板 |
