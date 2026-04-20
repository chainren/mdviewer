# Markdown Viewer 使用手册

## 概述

Markdown Viewer 是一个功能强大的 Markdown 文件预览器，支持实时渲染、流程图、多主题切换、文件树浏览、文档大纲导航等功能。本工具可以打包为单个可执行文件，方便在任何环境中部署和使用。

## 主要特性

### 📝 Markdown 渲染
- **GitHub Flavored Markdown (GFM)** 完整支持
- **标题大纲** 自动生成文档结构导航
- **代码高亮** 使用 Prism.js 自动识别语言并高亮显示
- **表格和列表** 完美支持复杂排版
- **实时渲染** 文件修改后自动更新显示

### 📊 流程图支持
- **Mermaid 图表** 本地渲染，支持流程图、时序图、甘特图等
- **PlantUML 支持** 通过代码块语法支持 PlantUML 图表
- **实时预览** 图表修改后立即更新

### 🎨 多主题系统
- **亮色/暗色主题** 随心切换
- **主题偏好记忆** 自动保存用户选择的主题
- **响应式设计** 适配不同屏幕尺寸

### 📁 文件管理
- **文件树浏览** 可展开/收起的文件浏览器
- **智能过滤** 仅显示 Markdown 文件（.md, .markdown, .mdown, .mkd, .mkdn）
- **快速导航** 点击文件立即预览

### 🧭 文档导航
- **大纲生成** 按标题层级自动生成导航
- **双向定位** 点击大纲跳转到对应位置，滚动时高亮当前章节
- **移动端适配** 保留大纲把手，便于展开/收起

### ✏️ 内置编辑器
- **实时编辑** 所见即所得的编辑体验
- **工具栏支持** 常用格式快捷按钮
- **快捷键操作** Ctrl+S 保存、Ctrl+B 加粗等
- **文件操作** 支持保存、另存为、覆盖保存

### 💬 评论与批注
- **块级评论** 对标题、段落、表格、列表、引用等内容块添加评论
- **文本选中评论** 选中任意文本后出现评论气泡，支持针对选中内容的精确评论
- **高亮标记** 已评论文本自动高亮显示（黄色下划线 + 💬角标）
- **评论回复** 支持评论线程，形成树状讨论结构
- **评论导航** 右下角浮动按钮显示评论总数，可上下翻页定位
- **数据持久化** 评论保存在 `.mdviewer-data/comments.json`

### ⚡ 实时同步
- **WebSocket 通信** 文件变更实时通知
- **自动刷新** 内容更新后自动重新渲染
- **冲突检测** 并发编辑时智能冲突处理

## 安装方式

### 系统要求
- **Node.js**: 18.0 或更高版本
- **操作系统**: Windows, macOS, Linux 均支持
- **内存**: 至少 512MB 可用内存
- **存储**: 100MB 可用磁盘空间

### 依赖包说明

Markdown Viewer 依赖以下 Node.js 包：

**核心依赖**:
- `express` (^4.18.2) - Web 服务器框架
- `marked` (^9.1.6) - Markdown 解析器
- `marked-highlight` (^2.0.6) - 代码高亮插件
- `prismjs` (^1.29.0) - 代码高亮库
- `mermaid` (^10.6.1) - 流程图渲染
- `plantuml-encoder` (^1.4.0) - PlantUML 编码
- `chokidar` (^3.5.3) - 文件系统监控
- `ws` (^8.14.2) - WebSocket 通信

### 安装依赖

#### 1. 安装 Node.js
请从 [Node.js 官网](https://nodejs.org/) 下载并安装适合您操作系统的版本（建议 18.0 或更高版本）。

#### 2. 获取程序文件
获取打包好的单个 JS 文件 `mdviewer.js`（或从源码构建）。

#### 3. 安装依赖包

```bash
# 安装所有依赖包
npm install express@^4.18.2 marked@^9.1.6 marked-highlight@^2.0.6 \
  prismjs@^1.29.0 mermaid@^10.6.1 plantuml-encoder@^1.4.0 \
  chokidar@^3.5.3 ws@^8.14.2
```

### 运行方式选择

#### 方式一：作为系统程序运行（推荐）
将程序安装为系统命令，可以在任何目录直接运行：

**Linux/macOS:**
```bash
# 创建本地 bin 目录（如果不存在）
mkdir -p ~/.local/bin

# 复制程序文件
cp mdviewer.js ~/.local/bin/mdviewer

# 添加执行权限
chmod +x ~/.local/bin/mdviewer

# 添加到 PATH（如果尚未添加）
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc  # 或 ~/.zshrc
source ~/.bashrc  # 重新加载配置

# 现在可以在任何目录运行
mdviewer
```

**Windows:**
```powershell
# 创建程序目录
mkdir "%USERPROFILE%\bin"

# 复制程序文件
copy mdviewer.js "%USERPROFILE%\bin\mdviewer.js"

# 添加到 PATH 环境变量
# 控制面板 -> 系统 -> 高级系统设置 -> 环境变量
# 在 PATH 中添加 %USERPROFILE%\bin

# 现在可以在任何目录运行
mdviewer
```

#### 方式二：使用 node 命令运行
不安装为系统程序，直接使用 node 命令运行：

```bash
# 基本用法
node mdviewer.js

# 指定端口
node mdviewer.js --port 8080

# 指定工作目录
node mdviewer.js --dir /path/to/markdown/files

# 完整参数示例
node mdviewer.js --port 4000 --dir ./docs
```

### 端口说明
- **HTTP 端口**: 默认 3000，可通过 `--port` 参数修改
- **WebSocket 端口**: HTTP 端口 + 5080（如 HTTP 用 3000，则 WebSocket 用 8080）

### 访问应用
启动成功后，在浏览器中访问：
```
http://localhost:3000
```

## 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 错误信息：Port 3000 is already in use
# 解决方案：使用其他端口
mdviewer --port 8080
```

#### 2. 权限不足
```bash
# 错误信息：Permission denied
# 解决方案：检查文件和目录权限
chmod 755 /path/to/markdown/files
```

#### 3. 依赖包缺失
```bash
# 错误信息：Cannot find module 'xxx'
# 解决方案：安装缺失的依赖包
npm install express marked marked-highlight prismjs mermaid plantuml-encoder chokidar ws
```

#### 4. 文件无法保存
- 检查文件是否被其他程序锁定
- 确认有足够的磁盘空间
- 验证文件路径是否正确
- 检查是否有写入权限

#### 5. 评论功能问题
- 选中文本后没有出现气泡：确认选中内容在文档正文区域内，且选中文本不为空
- 评论高亮消失：刷新页面后评论高亮会自动重新渲染；如果文档内容发生变化导致选中文本不再匹配，高亮可能无法恢复
- 评论数据丢失：检查 `.mdviewer-data/comments.json` 文件是否存在且有读写权限

#### 6. 图表不显示
- 检查网络连接（PlantUML 需要网络）
- 验证图表语法是否正确
- 查看浏览器控制台错误信息
- 确认相关依赖包已正确安装

---

*本手册适用于 Markdown Viewer v1.0.0 版本。随着软件更新，功能可能会有所变化，请以实际界面为准。*