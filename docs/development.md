# 开发文档

## 项目结构

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
├── package.json
└── tsconfig.json
```

## 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express** - Web框架
- **TypeScript** - 编程语言
- **Chokidar** - 文件监听
- **WS** - WebSocket支持

### 前端
- **HTML5/CSS3** - 页面结构和样式
- **JavaScript (ES6+)** - 前端逻辑
- **Marked.js** - Markdown解析
- **Prism.js** - 代码高亮
- **Mermaid** - 流程图渲染

## API 接口

### 获取文件列表
```http
GET /api/files
```

返回文件树结构：
```json
[
  {
    "name": "README.md",
    "path": "README.md",
    "type": "file"
  },
  {
    "name": "docs",
    "path": "docs",
    "type": "directory",
    "children": [...],
    "expanded": false
  }
]
```

### 读取文件内容
```http
GET /api/file/:path
```

返回文件内容和outline：
```json
{
  "content": "# Markdown内容",
  "outline": [
    {
      "level": 1,
      "text": "标题",
      "id": "heading-标题-0"
    }
  ],
  "path": "文件路径"
}
```

## 核心功能实现

### 文件树构建
```typescript
function buildFileTree(dirPath: string, basePath: string = dirPath): FileNode[] {
  const items: FileNode[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    
    if (entry.isDirectory()) {
      const children = buildFileTree(fullPath, basePath);
      if (children.length > 0) {
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
          expanded: false
        });
      }
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      items.push({
        name: entry.name,
        path: relativePath,
        type: 'file'
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
}
```

### Markdown渲染
```javascript
class MarkdownRenderer {
    constructor() {
        this.setupMarked();
        this.setupMermaid();
    }

    setupMarked() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });

        const renderer = new marked.Renderer();
        
        renderer.code = (code, language) => {
            if (language === 'mermaid') {
                return `<div class="mermaid">${code}</div>`;
            } else if (language === 'plantuml') {
                return this.renderPlantUML(code);
            } else {
                const validLang = language && Prism.languages[language] ? language : 'text';
                const highlighted = Prism.highlight(code, Prism.languages[validLang], validLang);
                return `<pre><code class="language-${validLang}">${highlighted}</code></pre>`;
            }
        };

        marked.use({ renderer });
    }
}
```

## 部署说明

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

### Docker 部署
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