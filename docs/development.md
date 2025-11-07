# 开发文档

本文档面向开发者，描述项目结构、关键实现、接口与安全约束，涵盖内置编辑器、文件树式“另存为”与并发冲突处理的实现细节。

## 项目结构

```
mdviewer/
├── src/
│   ├── server.ts          # Express 服务器入口（REST + 静态资源）
│   ├── fileUtils.ts       # 工作区路径解析与扩展校验
│   ├── types.ts           # 类型定义
│   └── public/
│       ├── index.html     # 预览主页面
│       ├── editor.html    # 内置编辑器页面
│       ├── css/
│       │   ├── main.css
│       │   └── themes.css
│       └── js/
│           ├── app.js         # 文件树、导航、编辑入口
│           ├── renderer.js    # MarkdownRenderer（Mermaid/Prism 集成）
│           ├── fileTree.js    # 文件树组件
│           └── editor.js      # 编辑器逻辑（保存/另存为/覆盖保存/快捷键）
├── docs/
│   ├── user-guide.md
│   └── development.md
├── README.md
├── package.json
└── tsconfig.json
```

## 技术与依赖

- Node.js + Express + TypeScript
- Chokidar：文件监听
- ws：WebSocket 推送
- 前端：Marked.js（Markdown），Prism.js（代码高亮），Mermaid（流程图）
- CDN：使用官方稳定路径（不加占位 SRI）

## 构建与运行

- 开发：`npm run dev`
- 构建：`npm run build`（tsc）
- 生产启动：`npm start`
- 静态资源同步：构建后将 `src/public/` 同步至 `dist/public/`

## 关键实现

### MarkdownRenderer（renderer.js）

- marked 配置：GFM、headerIds、一致的大纲 ID 规则
- code 渲染：
  - `mermaid` 代码块：生成 `<div class="mermaid">` 并由 Mermaid 渲染
  - 其他语言：Prism 高亮，未知语言回退到 `text`
- 渲染目标可配置：`renderContent(content, targetId='content-body')`

### 文件树（fileTree.js）

- 使用 `/api/files` 返回的树结构渲染，支持展开/收起
- 另存为弹窗中复用渲染逻辑，仅允许选择目录

### 内置编辑器（editor.js + editor.html）

- 加载逻辑：通过 `?file=` 拉取内容（`GET /api/file/:path`），右侧实时预览
- 保存：`POST /api/file/:path`，入参 `{ content, lastModified }`
- 并发冲突：服务端以 `stat.mtimeMs` 比较，冲突返回 409；前端弹窗“覆盖保存”后以 `{ override: true }` 重试
- 另存为：弹窗文件树选择目录 + 输入文件名；成功后替换地址栏 `file` 参数继续编辑
- 快捷键：Cmd/Ctrl+S/B/I 与 1..6 标题插入
- 预览开关：隐藏时不渲染，状态持久化到 localStorage

## 后端接口与安全

### GET `/api/files`
- 返回工作区内的 Markdown 文件树，过滤非 Markdown 扩展

### GET `/api/file/:path`
- 读取并返回 `{ content, outline, path, lastModified }`
- 路径解析：`resolveWorkspacePath(rawPath)` 防止越权与符号链接逃逸

### POST `/api/file/:path`
- 请求体：`{ content: string, lastModified?: number, override?: boolean }`
- 校验：
  - 同源校验（Origin/Referer 必须包含当前 host）
  - 工作区路径约束（仅允许 Markdown 扩展）
- 并发：当 `lastModified` 与 `fs.stat.mtimeMs` 不一致返回 `409`
- 覆盖保存：`override === true` 时跳过并发比较，继续写入
- 另存为：允许创建子目录（`mkdir recursive`），路径仍需在工作区内
- JSON 体大小上限：10MB（`express.json({ limit: '10mb' })`）

## 路径与扩展校验（fileUtils.ts）

- `resolveWorkspacePath(rawPath, { allowCreate })`：对用户传入路径进行 realpath + relative 校验，确保落在工作区内
- `isMarkdownFile(filename)`：仅允许 `.md/.markdown/.mdown/.mkd/.mkdn`
- `readMarkdownFile(...)`：受限于工作区与扩展

## 开发注意事项

- 修改后端逻辑需重启服务以生效
- 验证并发：可通过外部修改同一文件并用旧 `lastModified` 提交保存以触发 409
- 预览大纲在桌面与移动端的收起/展开把手需要保留 40px 可点击区域
- 安全：不要移除同源与工作区校验；避免记录或暴露敏感信息

## 提交与发布

- 提交前运行 `npm run build` 并确保无 TS 错误
- 使用 `git status && git diff` 检查变更范围；避免提交测试文档（可用 `git update-index --assume-unchanged`）
- 推送前确认变更仅为期望的源代码与文档更新

如需新增功能（例如更丰富的“另存为”目录选择器或错误提示），请遵循现有代码风格与架构进行扩展，并完善用户指南与开发文档。