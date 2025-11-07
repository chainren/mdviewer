# Markdown Viewer

一个基于 TypeScript 的 Markdown 文件预览与编辑器，支持实时渲染、流程图、多主题、文件树、文档大纲、代码高亮与响应式布局。后端使用 Node.js + Express，前端以原生 HTML/CSS/JS 结合 Marked.js、Prism.js 实现。

## ✨ 功能特性

- 📝 Markdown 渲染：GFM 支持、标题大纲、代码高亮、表格/列表等
- 📊 流程图：Mermaid 与 PlantUML（Mermaid 本地渲染，PlantUML 通过代码块语法支持）
- 🎨 多主题：亮色/暗色等多种主题，主题偏好自动保存
- 📁 文件树：可展开/收起的文件浏览器，仅显示 Markdown 文件
- 🧭 文档大纲：按标题层级生成导航，桌面与移动端均可收起/展开
- ⚡ 实时更新：文件变更通过 WebSocket 通知并自动刷新
- 💻 代码高亮：Prism.js 自动按语言高亮
- 📱 响应式：在移动端保留大纲把手，便于再次展开
- ✏️ 内置编辑器：新页面编辑当前文件，支持工具栏与快捷键
- 💾 文件树式“另存为”：弹窗内选择目标目录 + 输入文件名，支持新建子目录
- 🔐 并发冲突处理：保存时带 lastModified，服务端检出冲突返回 409；支持“覆盖保存”

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产构建与启动
```bash
npm run build
npm start
```

访问 http://localhost:3000

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

## 📋 API 概览

- GET `/api/files`：获取工作区内的 Markdown 文件树
- GET `/api/file/:path`：读取文件，返回 `{ content, outline, path, lastModified }`
- POST `/api/file/:path`：保存文件，入参 `{ content, lastModified? , override? }`
  - 校验：同源（Origin/Referer 包含 host）、工作区与扩展约束
  - 并发：当 `lastModified` 与服务器不一致返回 `409`；`override: true` 跳过并发校验

## ✏️ 内置编辑器说明

- 页面：`/editor.html?file=<相对路径>&return=<返回页>`
- 工具栏：保存、另存为、返回、预览开关、加粗/斜体、H1–H6
- 快捷键：
  - Cmd/Ctrl+S 保存
  - Cmd/Ctrl+B 加粗，Cmd/Ctrl+I 斜体
  - Cmd/Ctrl+1..6 插入标题 1–6
- 另存为：文件树式弹窗选择目录、输入文件名，仅允许 Markdown 扩展
- 并发冲突：保存返回 409 时弹窗提示，可“覆盖保存”重试（不传 lastModified，或传 `override:true`）

## 🔐 安全与约束

- 同源校验：仅允许 `http://localhost:3000`（或相同 host）的页面发起修改请求
- 工作区路径归一与约束：防越权与符号链接逃逸，仅允许工作区内的 Markdown 文件
- 请求体大小：`express.json({ limit: '10mb' })`

## ⚙️ 配置

- 支持扩展名：`.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`
- 默认端口：HTTP 3000，WebSocket 8080

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
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 贡献

欢迎提交 Issue 与 Pull Request！如有安全或并发相关问题，请附带复现步骤与 Network/Console 截图便于定位。

## 📄 许可证

MIT License
