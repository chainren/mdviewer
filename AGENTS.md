# 项目概述

这是一个基于 TypeScript 的 Markdown 文件预览器，支持实时渲染、流程图 (Mermaid 和 PlantUML)、多主题、文件树、文档大纲、代码高亮和响应式布局。它使用 Node.js 和 Express 作为后端，前端使用 HTML5、CSS3 和 JavaScript (ES6+)，并结合 Marked.js 进行 Markdown 解析，Prism.js 进行代码高亮。

## 构建和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

### 访问
应用将在 `http://localhost:3000` 运行。

## 开发约定

*   **语言:** TypeScript
*   **后端框架:** Express
*   **文件系统监听:** Chokidar
*   **实时通信:** WebSocket (ws)
*   **Markdown 解析:** Marked.js
*   **代码高亮:** Prism.js
*   **流程图:** Mermaid, PlantUML
*   **文件结构:**
    *   `src/server.ts`: Express 服务器入口
    *   `src/fileUtils.ts`: 文件系统相关的工具函数
    *   `src/types.ts`: TypeScript 类型定义
    *   `src/public/`: 静态资源目录，包含前端 HTML, CSS, JS
        *   `index.html`: 主页面
        *   `css/main.css`: 基础样式
        *   `css/themes.css`: 主题样式
        *   `js/app.js`: 前端主逻辑
        *   `js/renderer.js`: Markdown 渲染逻辑
        *   `js/fileTree.js`: 文件树组件逻辑
*   **支持的 Markdown 文件扩展名:** `.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`
*   **默认端口:** HTTP 服务器: 3000, WebSocket 服务器: 8080

