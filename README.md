# Markdown Viewer

一个基于TypeScript的Markdown文件预览器，支持实时渲染、流程图、多主题等功能。

## ✨ 功能特性

- 📝 **Markdown渲染** - 支持标准Markdown语法和GFM扩展
- 📊 **流程图支持** - Mermaid和PlantUML图表渲染
- 🎨 **多主题** - 5种主题：亮色、暗色、蓝色、绿色、紫色
- 📁 **文件树** - 可展开收起的文件浏览器
- 🎯 **文档大纲** - 按标题层级显示导航
- ⚡ **实时更新** - 文件变化时自动刷新
- 💻 **代码高亮** - 支持多种编程语言的语法高亮
- 📱 **响应式** - 适配桌面端和移动端

## 🚀 快速开始

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

访问 http://localhost:3000

## 📁 项目结构

```
markdown-viewer/
├── src/
│   ├── server.ts          # Express服务器
│   ├── fileUtils.ts       # 文件系统工具
│   ├── types.ts           # TypeScript类型定义
│   └── public/
│       ├── index.html     # 主页面
│       ├── css/
│       │   ├── main.css   # 基础样式
│       │   └── themes.css # 主题样式
│       └── js/
│           ├── app.js     # 前端主逻辑
│           ├── renderer.js # Markdown渲染
│           └── fileTree.js # 文件树组件
├── docs/                  # 文档
├── README.md             # 项目说明
├── package.json          # 项目配置
└── tsconfig.json         # TypeScript配置
```

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express** + **TypeScript**
- **Chokidar** - 文件系统监听
- **WS** - WebSocket实时通信

### 前端
- **HTML5** + **CSS3** + **JavaScript (ES6+)**
- **Marked.js** - Markdown解析
- **Prism.js** - 代码语法高亮
- **Mermaid** - 流程图渲染

## 📋 API接口

### 获取文件列表
```http
GET /api/files
```

### 读取文件内容
```http
GET /api/file/:path
```

### 获取文档大纲
```http
GET /api/outline/:path
```

## 🎯 使用说明

1. **文件浏览** - 左侧文件树显示所有Markdown文件
2. **文档导航** - 中间大纲显示标题结构，点击跳转
3. **主题切换** - 右上角主题按钮循环切换5种主题
4. **实时更新** - 文件修改时自动刷新（需要WebSocket连接）

## 🔧 配置选项

### 支持的文件扩展名
- `.md`
- `.markdown`
- `.mdown`
- `.mkd`
- `.mkdn`

### 默认端口
- HTTP服务器: 3000
- WebSocket服务器: 8080

## 📊 支持的图表

### Mermaid
- 流程图 (Flowchart)
- 时序图 (Sequence Diagram)
- 甘特图 (Gantt Chart)
- 类图 (Class Diagram)

### PlantUML
- UML类图
- 用例图
- 活动图
- 组件图

## 🚀 部署

### 本地部署
```bash
git clone <repository>
cd markdown-viewer
npm install
npm run build
npm start
```

### Docker部署
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

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**享受使用 Markdown Viewer！** 🎉