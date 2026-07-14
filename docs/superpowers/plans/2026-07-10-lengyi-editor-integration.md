# Lengyi Editor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `lengyi-markdown-editor` 的核心 Markdown 编辑能力吸收到 mdviewer 的文件型编辑器中。

**Architecture:** 保留 mdviewer 的服务端文件读写、路径安全、并发冲突和统一预览渲染器；新增一个可测试的前端编辑命令模块，再让 `editor.js` 调用该模块完成工具栏、查找替换、表格、图片、Mermaid 和导出能力。目标项目的 localStorage 自动保存和 CDN 渲染链路不直接复制。

**Tech Stack:** Vanilla JavaScript、HTML/CSS、Marked/Prism/Mermaid、Node.js 脚本测试、TypeScript/Express 后端保持不变。

---

### Task 1: 可测试编辑命令模块

**Files:**
- Create: `test-editor-commands.js`
- Create: `src/public/js/editorCommands.js`

- [ ] **Step 1: 编写失败测试**

测试覆盖选区包裹、标题替换、多行前缀、表格插入、查找替换、链接/图片/Mermaid 插入。

- [ ] **Step 2: 验证测试失败**

Run: `node test-editor-commands.js`
Expected: 因 `src/public/js/editorCommands.js` 不存在而失败。

- [ ] **Step 3: 实现命令模块**

提供 CommonJS + 浏览器全局 `MdEditorCommands` 双形态导出，命令直接操作 textarea-like 对象。

- [ ] **Step 4: 验证测试通过**

Run: `node test-editor-commands.js`
Expected: 输出 `editor command tests passed`。

### Task 2: 编辑器 UI 集成

**Files:**
- Modify: `src/public/editor.html`
- Create: `src/public/css/editor.css`
- Modify: `src/public/js/editor.js`

- [ ] **Step 1: 接入新脚本和样式**

在编辑器页面加载 `css/editor.css` 和 `js/editorCommands.js`，保留现有 `renderer.js`。

- [ ] **Step 2: 扩展工具栏**

新增下划线、删除线、引用、列表、任务列表、行内代码、代码块、链接、图片、表格、Mermaid、查找替换、导出按钮。

- [ ] **Step 3: 增加弹层和网格**

新增查找替换弹层、Mermaid 插入弹层、8×8 表格网格、拖拽导入提示。

- [ ] **Step 4: 改造 `editor.js`**

用 `MdEditorCommands` 替换原有简单命令，补充历史栈、查找替换、表格网格、图片 Base64 插入、Mermaid 模板、MD/HTML/Word/PDF 导出。

### Task 3: 文档与验证

**Files:**
- Modify: `README.md`
- Modify: `docs/development.md`

- [ ] **Step 1: 更新功能说明**

记录首批吸收的编辑功能和暂缓项。

- [ ] **Step 2: 运行验证**

Run: `node test-editor-commands.js`
Run: `npm run build`
Expected: 命令测试通过，TypeScript 构建通过。

### Self-Review

- 覆盖：首批实现聚焦可直接集成且不破坏保存模型的编辑能力。
- 无占位：每个任务都有明确文件、命令和预期结果。
- 一致性：正式保存仍走 mdviewer 当前 API，导出和草稿能力不覆盖服务端并发控制。
