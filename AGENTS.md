# 项目开发指南 (AGENTS.md)

本文档为 AI 代理和开发者提供本项目的开发规范、构建命令和架构说明。

## 1. 项目概览

**Markdown Viewer** 是一个基于 TypeScript 的 Markdown 文件预览与编辑器，支持实时渲染、流程图、多主题等功能。
- **后端**: Node.js + Express + TypeScript
- **前端**: 原生 HTML5/CSS3/JavaScript (ES6+)
- **核心库**: Marked.js (Markdown), Prism.js (Highlight), Mermaid/PlantUML (Diagrams), Chokidar (Watch), ws (WebSocket)

## 2. 构建与运行命令

### 安装与构建
```bash
# 安装依赖
npm install

# 开发模式 (TypeScript 实时编译 + Nodemon 重启)
npm run dev

# 生产构建 (生成 dist/ 目录)
npm run build

# 启动生产服务
npm start

# 单文件打包 (生成 mdviewer.js)
npm run build:bundle
```

### 测试
本项目目前使用独立的 Node.js 脚本进行测试，没有集成的测试框架。
```bash
# 运行特定测试脚本
node tests/test-editor-commands.js
node tests/test-markdown-math.js
# ... 运行 tests/ 下其他 test-*.js 文件

# 运行全部本地测试脚本（会先构建 dist/）
npm test
```

## 3. 代码风格规范

### 通用规则
*   **语言**: 回复和注释请使用 **中文**。
*   **AIGC 标记**: 在 AI 生成或修改的关键代码块前后添加注释：
    ```typescript
    // AIGC START
    ... 代码 ...
    // AIGC END
    ```

### 后端 (TypeScript - `src/`)
*   **缩进**: **2 空格**。
*   **分号**: 必须使用分号 `;`。
*   **导入**: 使用 `import * as fs from 'fs';` 风格（符合 `tsconfig.json` 的 `esModuleInterop` 和 `commonjs` 配置）。
*   **类型**: 显式定义接口 (Interface) 和类型 (Type)。
*   **错误处理**: 使用 `try-catch` 块，并记录错误日志 `console.error`。
*   **文件操作**: 优先使用 `fs.promises` 或 `fs.readFileSync` (同步仅用于启动/配置读取)。

### 前端 (JavaScript - `src/public/js/`)
*   **缩进**: **4 空格**。
*   **架构**: 基于类的面向对象设计 (e.g., `class MarkdownViewerApp`, `class FileTree`)。
*   **DOM 操作**: 使用原生 DOM API (`document.getElementById`, `addEventListener`)，不依赖 jQuery 或 Vue/React。
*   **模块**: 目前使用全局脚本加载，注意全局变量污染。

## 4. 关键架构与注意事项

### 核心逻辑同步
*   **大纲提取 (`extractOutline`)**: 此函数存在于 `src/fileUtils.ts` (后端) 和 `src/public/js/renderer.js` (前端)。**修改时必须两边同步**，确保前后端生成的大纲结构和 ID 一致。

### 安全约束
*   **路径安全**: 所有文件操作必须通过 `resolveWorkspacePath` (in `src/fileUtils.ts`) 校验，防止路径穿越 (`../`)。
*   **同源策略**: 修改接口 (`POST /api/file/:path`) 必须校验 `Origin/Referer`。

### 数据流
1.  **初始化**: 客户端请求 `/api/files` 获取文件树。
2.  **加载**: 请求 `/api/file/:path` 获取内容和元数据。
3.  **更新**:
    *   **编辑器保存**: POST 请求，携带 `lastModified` 做并发检查。
    *   **外部修改**: Chokidar 监听到文件变化 -> WebSocket 通知客户端 -> 客户端重新拉取内容。

## 5. 目录结构
*   `src/server.ts`: 后端入口，API 定义。
*   `src/fileUtils.ts`: 核心工具（路径处理、大纲提取、文件树构建）。
*   `src/public/`: 前端静态资源（HTML/CSS/JS）。
*   `scripts/`: 构建脚本（如资源内嵌）。

## 6. Cursor/Copilot 规则摘要
*   **Always respond in Chinese.**
*   Add `// AIGC START` and `// AIGC END` comments to generated code.
