# Markdown Viewer

一个基于 TypeScript 的 Markdown 文件预览与编辑器，支持实时渲染、流程图、多主题、文件树、文档大纲、代码高亮与响应式布局。后端使用 Node.js + Express，前端以原生 HTML/CSS/JS 结合 Marked.js、Prism.js 实现。

## ✨ 功能特性

### 核心功能
- 📝 **Markdown 渲染**：完整 GFM 支持、自动生成标题大纲、代码高亮、表格/列表/任务列表等
- 📊 **流程图支持**：Mermaid 客户端渲染、PlantUML 代码块语法支持
- 🎨 **多主题切换**：内置亮色/暗色等多种主题，主题偏好自动保存到本地
- 📁 **智能文件树**：可展开/收起的文件浏览器，仅显示 Markdown 文件，支持目录层级
- 🔍 **文件搜索**：实时搜索文件名，自动展开匹配项的所有父级目录，支持一键清除
- 🧭 **文档大纲导航**：按标题层级自动生成导航，桌面与移动端均可收起/展开

### 实时协作
- ⚡ **实时文件监听**：基于 Chokidar，文件变更通过 WebSocket 自动通知并刷新
- 🔄 **自动端口检测**：HTTP 端口占用时自动递增（3001→3002→3003...）
- 🌐 **WebSocket 同步**：WS 端口 = HTTP 端口 + 5080，确保稳定连接

### 编辑能力
- ✏️ **内置编辑器**：独立页面编辑，支持工具栏与快捷键（Cmd/Ctrl+S 保存等）
- 💾 **文件树式另存为**：弹窗内选择目标目录 + 输入文件名，支持新建子目录
- 🔐 **并发冲突处理**：保存时带 lastModified，服务端检出冲突返回 409；支持"覆盖保存"
- 📝 **实时预览**：编辑器内可切换预览模式，支持 Markdown/Mermaid 实时渲染
- 📄 **新建文件/目录**：右键菜单支持新建 Markdown 文件和文件夹

### 交互体验
- ⌨️ **键盘导航**：文件树支持方向键导航、Enter 打开、Space 展开/折叠
- 🖱️ **右键菜单**：文件/目录右键菜单（打开、编辑、复制路径、新建、刷新等）
- 📋 **快捷操作**：一键刷新文件列表、折叠/展开文件浏览器、复制文件路径

### 安全与性能
- 🔒 **同源校验**：CSRF 防护，仅允许同源页面发起修改请求
- 🛡️ **路径约束**：防越权与符号链接逃逸，仅允许工作区内的 Markdown 文件
- 💻 **代码高亮**：Prism.js 自动识别 50+ 编程语言
- 📱 **响应式布局**：移动端优化，保留大纲把手便于再次展开
- 📦 **单文件打包**：支持打包为独立可执行文件，内嵌所有静态资源

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

启动脚本支持自动环境检测、依赖安装和服务启动：

**Linux/macOS:**
```bash
chmod +x start-mdviewer.sh
./start-mdviewer.sh
```

**Windows:**
```cmd
start-mdviewer.bat
```

**脚本功能：**
- 自动检测 Node.js/npm 环境，缺失时提示安装
- 自动生成 package.json（如果不存在）
- 自动安装项目依赖
- 检测端口占用，显示本地和局域网访问地址
- 可选检测 Java 和 GraphViz（PlantUML 支持）

### 方式二：手动启动

#### 安装依赖
```bash
npm install
```

#### 开发模式
```bash
npm run dev
```

#### 生产构建与启动
```bash
npm run build
npm start
```

### 方式三：单文件执行

打包后可直接运行：
```bash
npm run build:bundle
node mdviewer.js

# 或安装到系统后直接使用：
npm run release:local
mdviewer
```

### CLI 参数

```bash
# 指定工作目录
mdviewer --dir /path/to/markdowns

# 指定端口
mdviewer --port 4000

# 组合使用
mdviewer --dir ~/Documents/notes --port 8080
```

### 访问应用

启动后访问：
- **本地访问**：`http://localhost:3001`（默认）
- **局域网访问**：`http://<本机IP>:3001`
- **端口说明**：如被占用将自动递增（3002、3003...）
- **WebSocket**：WS 端口 = HTTP 端口 + 5080

## 📁 项目结构
```

#### 生产构建与启动
```bash
npm run build
npm start
```

### 方式三：单文件执行

打包后可直接运行：
```bash
npm run build:bundle
node mdviewer.js

# 或安装到系统后直接使用：
npm run release:local
mdviewer
```

### CLI 参数

```bash
# 指定工作目录
mdviewer --dir /path/to/markdowns

# 指定端口
mdviewer --port 4000

# 组合使用
mdviewer --dir ~/Documents/notes --port 8080
```

### 访问应用

启动后访问：
- **本地访问**：`http://localhost:3001`（默认）
- **局域网访问**：`http://<本机IP>:3001`
- **端口说明**：如被占用将自动递增（3002、3003...）
- **WebSocket**：WS 端口 = HTTP 端口 + 5080

## 📁 项目结构

```
mdviewer/
├── src/
│   ├── server.ts          # Express 服务器入口
│   ├── fileUtils.ts       # 文件/路径工具：扩展校验、工作区约束等
│   ├── types.ts           # TypeScript 类型定义
│   └── public/            # 静态资源（前端）
│       ├── index.html     # 预览主页面
│       ├── editor.html    # 内置编辑器页面
│       ├── css/
│       │   ├── main.css
│       │   └── themes.css
│       └── js/
│           ├── app.js         # 前端主逻辑（文件树、导航、跳转到编辑器）
│           ├── renderer.js    # Markdown 渲染逻辑（Mermaid/Prism）
│           ├── fileTree.js    # 文件树组件
│           └── editor.js      # 编辑器页面逻辑（保存/另存为/覆盖保存/快捷键）
├── docs/
│   ├── user-guide.md
│   └── development.md
├── README.md
├── package.json
└── tsconfig.json
```

## 🛠️ 技术栈

- 后端：Node.js + Express + TypeScript
- 文件监听：Chokidar
- 实时通信：ws（WebSocket）
- 前端：HTML5/CSS3/JavaScript(ES6+)
- Markdown：Marked.js（官方 CDN 稳定路径）
- 代码高亮：Prism.js
- 流程图：Mermaid（CDN），PlantUML（代码块语法支持）

## ⚙️ 配置与 CLI

### 文件支持
- **Markdown 扩展名**：`.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`
- **工作目录**：默认为当前目录，可通过 `--dir` 指定

### 端口配置
- **HTTP 默认端口**：3001（起始值）
  - 被占用时自动 +1 重试（3002, 3003...）
  - 可通过 `--port` 或 `PORT` 环境变量指定
- **WebSocket 端口**：HTTP 端口 + 5080
  - 示例：HTTP 3001 → WS 8081，HTTP 4000 → WS 9080

### CLI 命令行参数
```bash
# 指定工作目录
mdviewer --dir /path/to/markdowns

# 指定端口
mdviewer --port 4000

# 组合使用
mdviewer --dir ~/Documents/notes --port 8080
```

### 安全配置
- **请求体大小**：`10MB` （支持编辑大型 Markdown 文件）
- **同源策略**：仅允许同域名请求修改文件
- **路径隔离**：仅允许访问工作区内文件，防止路径穿越

## 📋 API 概览

### 文件管理
- **GET `/api/files`**：获取工作区内的 Markdown 文件树
  - 返回：`FileNode[]` 树型结构
  - 包含：文件名、路径、类型（file/directory）、子节点

- **GET `/api/file/:path(*)`**：读取文件
  - 返回：`{ content, outline, path, lastModified }`
  - `content`：文件内容（字符串）
  - `outline`：标题大纲数组
  - `lastModified`：文件修改时间戳（毫秒）

- **POST `/api/file/:path(*)`**：保存文件
  - 入参：`{ content: string, lastModified?: number, override?: boolean }`
  - 校验：
    - 同源检查（Origin/Referer 包含 host）
    - 工作区约束（防路径逾出）
    - Markdown 扩展名检查
  - 并发控制：
    - 当 `lastModified` 与服务器不一致时返回 `409 Conflict`
    - `override: true` 跳过并发检查，强制覆盖
  - 返回：`{ success, path, outline, lastModified }`

- **GET `/api/outline/:path(*)`**：获取文件大纲
  - 返回：`OutlineItem[]` 标题层级数组

### 静态资源
- **GET `/`, `/index.html`**：预览主页面
- **GET `/editor.html`**：编辑器页面
- **GET `/css/**`, `/js/**`**：样式和脚本资源（内嵌或CDN）
- **GET `/icon.svg`, `/favicon.*`**：图标资源

### WebSocket 事件
- **连接：**`ws://localhost:<HTTP端口+5080>`
- **消息类型：**
  - `connection`：连接成功通知
  - `file-change`：文件变更通知（自动重载）

## ✏️ 内置编辑器说明

### 访问方式
- **URL 格式**：`/editor.html?file=<相对路径>&return=<返回页>`
- **快捷入口**：在预览页点击“编辑文件”按钮

### 工具栏功能
- **文件操作**：保存、另存为、返回预览
- **预览控制**：实时预览开关（状态持久化）
- **格式工具**：加粗、斜体、标题（H1–H6）

### 快捷键
- **Cmd/Ctrl+S**：保存当前文件
- **Cmd/Ctrl+B**：加粗选中文本
- **Cmd/Ctrl+I**：斜体选中文本
- **Cmd/Ctrl+1–6**：插入标题 1–6 级

### 另存为功能
- **文件树选择**：弹窗内浏览目录结构
- **目录操作**：支持新建子目录
- **文件名验证**：仅允许 Markdown 扩展名（.md/.markdown/.mdown/.mkd/.mkdn）
- **路径安全**：自动防止路径逾出工作区

### 并发冲突处理
1. **检测机制**：保存时携带 `lastModified` 时间戳
2. **冲突提示**：返回 409 时弹窗警告“文件已被修改”
3. **解决方案**：
   - 取消保存，手动合并
   - “覆盖保存”（传 `override: true`）强制覆盖

### 实时预览
- **Markdown 渲染**：Marked.js 实时解析
- **代码高亮**：Prism.js 自动识别语言
- **Mermaid 图表**：实时渲染流程图、时序图等
- **性能优化**：预览关闭时停止渲染，节省资源

## 🔐 安全与约束

- 同源校验：仅允许 `http://localhost:3000`（或相同 host）的页面发起修改请求
- 工作区路径归一与约束：防越权与符号链接逃逸，仅允许工作区内的 Markdown 文件
- 请求体大小：`express.json({ limit: '10mb' })`

## ⚙️ 配置与 CLI

### 文件支持
- **Markdown 扩展名**：`.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`
- **工作目录**：默认为当前目录，可通过 `--dir` 指定

### 端口配置
- **HTTP 默认端口**：3001（起始值）
  - 被占用时自动 +1 重试（3002, 3003...）
  - 可通过 `--port` 或 `PORT` 环境变量指定
- **WebSocket 端口**：HTTP 端口 + 5080
  - 示例：HTTP 3001 → WS 8081，HTTP 4000 → WS 9080

### CLI 命令行参数
```bash
# 指定工作目录
mdviewer --dir /path/to/markdowns

# 指定端口
mdviewer --port 4000

# 组合使用
mdviewer --dir ~/Documents/notes --port 8080

# 使用环境变量
PORT=3333 mdviewer --dir ~/docs
```

### 安全配置
- **请求体大小**：`10MB` （支持编辑大型 Markdown 文件）
- **同源策略**：仅允许同域名请求修改文件
- **路径隔离**：仅允许访问工作区内文件，防止路径穿越

## 🧪 验证建议

- 在预览页点击“编辑文件”，进入编辑器并加载当前文件
- 在编辑器中输入文本，预览实时更新；预览开关隐藏时不渲染，状态持久化
- 保存成功更新 `lastModified`；外部修改后保存应返回 409 并出现覆盖保存弹窗
- 使用“另存为”到新相对路径（Markdown 扩展），成功后更新地址并可继续编辑
- 预览页大纲收起/展开在桌面与移动端均正常，控制台无报错

## 🚀 部署

本地部署：
```bash
git clone <repository>
cd mdviewer
npm install
npm run build
npm start
```

Docker 示例：
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 📦 单文件打包、安装与使用

支持将项目打包为单个可执行文件并在任何目录运行。

### 打包流程

```bash
# 1. 安装依赖（首次执行）
npm install

# 2. 构建 TypeScript 并内嵌静态资源
npm run build

# 3. 打包为单文件（包含所有依赖）
npm run build:bundle
# 生成: mdviewer.js（带 shebang，可直接执行）
```

**打包特性：**
- ✅ 内嵌所有静态资源（HTML/CSS/JS）
- ✅ Bundle 所有 Node.js 依赖（除 fsevents）
- ✅ 带 shebang (`#!/usr/bin/env node`)
- ✅ 大小约 2-3MB，无需 node_modules

### 安装方式

#### 方式 A：本地用户级安装（推荐）

```bash
# 一键构建+安装
npm run release:local
# 会执行：build → build:bundle → 安装到 ~/.local/bin/mdviewer

# 或手动安装已打包文件
npm run install:local
# 仅复制 mdviewer.js 到 ~/.local/bin/mdviewer
```

**确保 PATH 配置：**
```bash
# 检查 ~/.local/bin 是否在 PATH 中
echo $PATH | grep -q "$HOME/.local/bin" && echo "OK" || echo "Need to add"

# 如需添加（zsh）
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

# 如需添加（bash）
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

#### 方式 B：全局安装（需 sudo）

```bash
# 复制到系统目录
sudo cp mdviewer.js /usr/local/bin/mdviewer
sudo chmod +x /usr/local/bin/mdviewer
```

#### 方式 C：直接运行

```bash
# 不安装，直接执行
node mdviewer.js

# 或赋予执行权限后直接运行
chmod +x mdviewer.js
./mdviewer.js
```

### 使用示例

```bash
# 基本使用（当前目录作为工作区）
mdviewer

# 指定 Markdown 文档目录
mdviewer --dir ~/Documents/notes
mdviewer --dir /path/to/markdowns

# 指定端口
mdviewer --port 4000
mdviewer --port 8080

# 组合使用
mdviewer --dir ~/wiki --port 5000

# 使用环境变量
PORT=3333 mdviewer --dir ~/docs
```

### 运行说明

- **默认端口**：HTTP 起始端口 3001，占用时自动递增
- **WebSocket 端口**：WS 端口 = HTTP 端口 + 5080
  - 示例：HTTP 3001 → WS 8081，HTTP 4000 → WS 9080
- **工作目录**：默认为当前目录，仅扫描其中的 Markdown 文件
- **权限需求**：仅需读写工作目录，无需 root

### 卸载

```bash
# 本地用户级安装
rm ~/.local/bin/mdviewer

# 全局安装
sudo rm /usr/local/bin/mdviewer
```

## 📝 更新日志

### v1.0.0 主要特性

#### 核心功能
- ✅ 完整的 Markdown GFM 渲染（表格、任务列表、代码块等）
- ✅ 实时文件监听与 WebSocket 自动刷新
- ✅ 多主题切换（亮色/暗色），主题持久化
- ✅ 智能文件树，仅显示 Markdown 文件
- ✅ 文件搜索功能，实时过滤和高亮匹配项
- ✅ 文档大纲自动生成，支持折叠展开

#### 编辑器功能
- ✅ 内置 Markdown 编辑器，支持实时预览
- ✅ 工具栏快捷操作（加粗、斜体、标题）
- ✅ 快捷键支持（Cmd/Ctrl+S 保存等）
- ✅ 文件树式"另存为"功能
- ✅ 并发冲突检测与覆盖保存
- ✅ 右键菜单新建文件和文件夹
- ✅ 键盘导航支持（方向键、Enter、Space）
- ✅ 复制文件路径到剪贴板

#### 流程图支持
- ✅ Mermaid 客户端渲染（流程图、时序图、甘特图等）
- ✅ PlantUML 代码块语法支持

#### 安全特性
- ✅ 同源校验（CSRF 防护）
- ✅ 路径约束（防止目录穿越）
- ✅ 工作区隔离（仅访问指定目录）

#### 部署方案
- ✅ 单文件打包（内嵌所有资源）
- ✅ 本地用户级安装（无需 sudo）
- ✅ 自动端口检测（避免冲突）
- ✅ CLI 参数支持（--dir, --port）

#### 启动脚本
- ✅ Linux/macOS/Windows 启动脚本
- ✅ 自动环境检测（Node.js/npm）
- ✅ 自动生成 package.json
- ✅ 自动依赖安装
- ✅ 局域网访问地址显示

## 🤝 贡献

欢迎提交 Issue 与 Pull Request！如有安全或并发相关问题，请附带复现步骤与 Network/Console 截图便于定位。

## 📄 许可证

MIT License
