# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Markdown Viewer** 是一个基于 TypeScript 的 Markdown 文件预览与编辑器，支持实时渲染、流程图（Mermaid/PlantUML）、多主题、智能文件树和文档大纲。

## 构建与运行

```bash
# 开发环境（热重载）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 单文件打包
npm run build:bundle

# 本地安装到 ~/.local/bin
npm run release:local
```

**启动脚本**：`chmod +x start-mdviewer.sh && ./start-mdviewer.sh`

## 架构概览

### 后端架构（Node.js + Express + TypeScript）

- **`src/server.ts`** - Express 服务器入口，配置路由、文件监听、WebSocket
- **`src/fileUtils.ts`** - 文件系统操作、路径解析、扩展名校验、工作区安全约束
- **`src/types.ts`** - TypeScript 类型定义（FileNode、FileChangeEvent 等）
- **`src/embeddedAssets.ts`** - 静态资源内嵌（由 `scripts/embed-assets.js` 生成）

**端口配置**：
- HTTP 默认端口：3001
- WebSocket 端口 = HTTP 端口 + 5080

### 前端架构（原生 JavaScript）

- **`src/public/js/app.js`** - MarkdownViewerApp 主控制器
- **`src/public/js/renderer.js`** - MarkdownRenderer，处理 marked.js/Prism.js/Mermaid 渲染
- **`src/public/js/fileTree.js`** - FileTree 组件，键盘导航、右键菜单
- **`src/public/js/editor.js`** - 内置编辑器逻辑

### 前后端通信

**REST API**：
- `GET /api/files` - 获取 Markdown 文件树
- `GET /api/file/:path` - 读取文件（返回 content、outline、path、lastModified）
- `POST /api/file/:path` - 保存文件（并发冲突检测，409 状态码）
- `GET /api/outline/:path` - 获取文件大纲

**WebSocket**：
- 文件变更实时推送（Chokidar 监听 → WebSocket 推送）
- 消息格式：`{ type: 'file-change', data: { path: string } }`

### 关键设计模式

#### 1. 大纲提取一致性
`extractOutline()` 函数在服务器端（`src/server.ts`）和客户端（`src/public/js/renderer.js`）必须保持一致：
- 跳过代码块（fenced code blocks，``` 或 ~~~）
- 跳过缩进代码块（4 空格或 tab）
- 生成相同的 heading ID：`heading-${text}-${index}`

#### 2. 并发冲突处理
- 文件保存携带 `lastModified` 时间戳
- 服务器检测冲突返回 409 状态码
- 前端提示用户选择"取消"或"覆盖"

#### 3. 安全机制
- **路径约束**：`src/fileUtils.ts` 防止路径穿越和符号链接逃逸
- **扩展名校验**：仅允许 `.md/.markdown/.mdown/.mkd/.mkdn` 文件
- **同源检查**：文件修改操作验证 Referer/Origin 头

## 静态资源内嵌

构建流程：
1. `scripts/embed-assets.js` 扫描 `src/public/` 生成 `src/embeddedAssets.ts`
2. TypeScript 编译时内嵌静态资源到 JavaScript
3. 生产模式下无需 `src/public/` 目录

## 常见问题修复

### 代码块中的 `#` 被识别为标题
**问题位置**：`src/public/js/renderer.js` 的 `extractOutline()` 函数
**原因**：未正确跳过 fenced code blocks（``` 或 ~~~）
**修复**：确保 `inFence` 标志正确切换

```javascript
// 正确的代码块检测逻辑
const fenceMatch = rawLine.match(/^\s*(```|~~~)/);
if (fenceMatch) {
    const marker = fenceMatch[1];
    if (!inFence) {
        inFence = true;
        fenceMarker = marker;
    } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = null;
    }
    continue;
}
if (inFence) continue; // 跳过代码块内的所有内容
```

## 开发注意事项

1. **修改前端代码**：刷新页面即可（开发模式下静态资源直接服务）
2. **修改后端代码**：nodemon 会自动重启服务
3. **修改静态资源**：重新运行 `npm run build` 更新 `embeddedAssets.ts`
4. **大纲 ID 同步**：修改 `extractOutline()` 必须同步修改 `src/server.ts` 和 `src/public/js/renderer.js`
5. **WebSocket 调试**：打开浏览器控制台查看 WebSocket 连接状态

## 依赖库

- **marked.js** - Markdown 解析
- **Prism.js** - 代码高亮
- **Mermaid** - 流程图渲染
- **PlantUML** - 通过官方服务器渲染（编码使用 pako.deflateRaw）
- **Chokidar** - 文件监听
- **Express** - Web 服务器
- **ws** - WebSocket 服务器
