import express from 'express';
import * as path from 'path';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as net from 'net';
import { buildFileTree, readMarkdownFile, extractOutline, isMarkdownFile, resolveWorkspacePath, getWorkspaceRootReal } from './fileUtils';
import { FileNode, FileChangeEvent } from './types';
import * as crypto from 'crypto';

// ==================== 文件树缓存 ====================

interface FileTreeCache {
  data: FileNode[];
  lastModified: number;   // 缓存创建/更新时间戳
  etag: string;           // 用于 HTTP 304 响应
}

let fileTreeCache: FileTreeCache | null = null;

function clearFileTreeCache() {
  fileTreeCache = null;
}

async function getFileTree(): Promise<FileTreeCache> {
  if (!fileTreeCache) {
    const currentDir = process.cwd();
    const data = await buildFileTree(currentDir);
    const lastModified = Date.now();
    fileTreeCache = {
      data,
      lastModified,
      etag: crypto.createHash('md5').update(JSON.stringify(data)).digest('hex'),
    };
  }
  return fileTreeCache;
}

// ==================== 评论数据存储 ====================

const DATA_DIR = path.join(process.cwd(), '.mdviewer-data');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');

interface Comment {
  id: string;
  author: string;
  ip: string;
  content: string;
  time: string;
  elementId: string;
  parentId?: string;
  selectedText?: string;
  textOffset?: number;
  textLength?: number;
}

interface CommentsStore {
  [filePath: string]: {
    [elementId: string]: Comment[];
  };
}

let commentsStore: CommentsStore = {};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadComments() {
  try {
    if (!fs.existsSync(COMMENTS_FILE)) {
      commentsStore = {};
      return;
    }
    const raw = fs.readFileSync(COMMENTS_FILE, 'utf-8');
    if (!raw) {
      commentsStore = {};
      return;
    }
    commentsStore = JSON.parse(raw);
  } catch (error) {
    console.error('读取评论数据失败:', error);
    commentsStore = {};
  }
}

function saveComments() {
  try {
    ensureDataDir();
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(commentsStore, null, 2), 'utf-8');
  } catch (error) {
    console.error('写入评论数据失败:', error);
  }
}

const app = express();

// CLI 参数解析：--dir /path/to/workspace，--port 4000
function parseArg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === `--${name}`) {
      return argv[i + 1];
    }
    if (token.startsWith(`--${name}=`)) {
      return token.substring(name.length + 3);
    }
  }
  return undefined;
}

const dirArg = parseArg('dir');
if (dirArg) {
  const candidate = path.resolve(process.cwd(), dirArg);
  const stat = fs.statSync(candidate);
  if (!stat.isDirectory()) {
    throw new Error(`--dir 指定路径不是目录: ${candidate}`);
  }
  const real = fs.realpathSync(candidate);
  process.chdir(real);
  console.log(`[workspace] 使用目录: ${real}`);
} else {
  console.log(`[workspace] 使用当前目录: ${process.cwd()}`);
}

const WORKSPACE_ROOT = getWorkspaceRootReal();
const portArg = parseArg('port');
const PORT = (portArg ? Number(portArg) : (process.env.PORT ? Number(process.env.PORT) : 3001)) || 3001;

app.use(express.json({ limit: '10mb' }));
import { assets } from './embeddedAssets';

// 内嵌静态资源服务
app.get(['/', '/index.html'], (req, res) => {
  const a = assets['index.html'] || assets['/index.html'] || assets['index.htm'] || assets['/index.htm'];
  if (!a) return res.status(404).send('Not Found');
  res.setHeader('Content-Type', a.type);
  res.send(a.content);
});

app.get(['/icon.svg', '/favicon.svg', '/favicon.ico'], (req, res) => {
  const key = req.path.startsWith('/') ? req.path : `/${req.path}`;
  const alt = key.slice(1);
  const a = assets[key] || assets[alt];
  if (!a) return res.status(404).send('Not Found');
  res.setHeader('Content-Type', a.type);
  res.send(a.content);
});

app.get(/^\/(css|js|img|fonts)\/.*$/, (req, res) => {
  const p = req.path; // 如 /css/main.css
  const a = assets[p];
  if (!a) return res.status(404).send('Not Found');
  res.setHeader('Content-Type', a.type);
  res.send(a.content);
});

// 工作区静态资源访问
app.use('/workspace', express.static(WORKSPACE_ROOT, {
  dotfiles: 'deny',
  redirect: false
}));

app.use('/workspace/*', (req, res) => {
  res.status(404).send('Not Found');
});

// 编辑器页面
app.get('/editor.html', (req, res) => {
  const a = assets['/editor.html'] || assets['editor.html'];
  if (!a) return res.status(404).send('Not Found');
  res.setHeader('Content-Type', a.type);
  res.send(a.content);
});

// 计算 WebSocket 端口：与 HTTP 端口保持固定偏移，方便客户端推导
const WS_OFFSET = 5080;
let wss: WebSocket.Server | null = null;

function broadcastChange(event: FileChangeEvent) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'file-change',
        data: event
      }));
    }
  });
}

app.get('/api/files', async (req, res) => {
  try {
    const cache = await getFileTree();

    // HTTP 缓存头
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Last-Modified', new Date(cache.lastModified).toUTCString());
    res.setHeader('ETag', `"${cache.etag}"`);

    // 检查条件请求，支持 304 Not Modified
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifNoneMatch === `"${cache.etag}"` ||
        (ifModifiedSince && new Date(ifModifiedSince).getTime() >= cache.lastModified)) {
      res.status(304).end();
      return;
    }

    res.json(cache.data);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

app.get('/api/file/:path(*)', (req, res) => {
  try {
    const rawPath = req.params.path;
    const content = readMarkdownFile(rawPath);
    const resolved = resolveWorkspacePath(rawPath);
    const stat = fs.statSync(resolved);
    const lastModified = stat.mtimeMs;
    const outline = extractOutline(content);
    
    res.json({
      content,
      outline,
      path: rawPath,
      lastModified
    });
  } catch (error: any) {
    console.error('Error reading file:', error);
    if (error && (error.code === 'EWORKSPACE' || error.code === 'EBADTYPE')) {
      return res.status(400).json({ error: 'Invalid path or type' });
    }
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// 保存文件接口（仅限 Markdown）
app.post('/api/file/:path(*)', async (req, res) => {
  try {
    const rawPath = req.params.path;
    const fsPromises = require('fs').promises;

    // CSRF 基本同源校验
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const host = req.headers.host || '';
    const sameOrigin = (origin.includes(host) || referer.includes(host));
    if (!sameOrigin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // 归一化并约束在工作区内，允许新建（另存为）
    let resolved: string;
    try {
      resolved = resolveWorkspacePath(rawPath, { allowCreate: true });
    } catch (e: any) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!isMarkdownFile(resolved)) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const content: string = (req.body && typeof req.body.content === 'string') ? req.body.content : undefined;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid content' });
    }

    // 并发检测：若请求包含客户端 lastModified，与当前文件 mtime 不一致则返回 409
    let clientMtime: number | undefined = undefined;
    if (typeof (req.body as any).lastModified === 'number') {
      clientMtime = (req.body as any).lastModified;
    }
    let currentStat: fs.Stats | undefined;
    try { currentStat = fs.statSync(resolved); } catch {}

    const override = !!(req.body && (req.body as any).override === true);
    if (!override && clientMtime && currentStat && Math.round(clientMtime) !== Math.round(currentStat.mtimeMs)) {
      return res.status(409).json({ error: 'Conflict: file modified by others' });
    }

    // 若目录不存在，可选创建
    const dir = path.dirname(resolved);
    try {
      await fsPromises.mkdir(dir, { recursive: true });
    } catch {}

    // 异步写入文件
    await fsPromises.writeFile(resolved, content, 'utf-8');

    const outline = extractOutline(content);
    const stat = fs.statSync(resolved);
    return res.json({ success: true, path: rawPath, outline, lastModified: stat.mtimeMs });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

app.get('/api/outline/:path(*)', (req, res) => {
  try {
    const filePath = req.params.path;
    const content = readMarkdownFile(filePath);
    const outline = extractOutline(content);
    res.json(outline);
  } catch (error) {
    console.error('Error extracting outline:', error);
    res.status(500).json({ error: 'Failed to extract outline' });
  }
});

// ==================== 评论 API ====================

// 获取文件的所有评论
app.get('/api/comments/:path(*)', (req, res) => {
  try {
    const filePath = req.params.path;
    const fileComments = commentsStore[filePath] || {};
    res.json({ success: true, comments: fileComments });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// 添加评论
app.post('/api/comments/:path(*)', (req, res) => {
  try {
    const filePath = req.params.path;
    const { elementId, author, content, parentId, selectedText, textOffset, textLength } = req.body || {};

    if (!elementId || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const trimmedAuthor = author ? String(author).trim() : 'Anonymous';
    const trimmedContent = String(content).trim();
    // 获取 IP 地址
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    if (!trimmedContent) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (!commentsStore[filePath]) {
      commentsStore[filePath] = {};
    }

    if (!commentsStore[filePath][elementId]) {
      commentsStore[filePath][elementId] = [];
    }

    // 处理 parentId，防止 "undefined" 字符串
    const validParentId = (parentId && parentId !== 'undefined' && parentId !== 'null') ? parentId : undefined;

    // 安全的 ID 生成
    let commentId;
    try {
      commentId = crypto.randomUUID();
    } catch (e) {
      commentId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    const comment: Comment = {
      id: commentId,
      author: trimmedAuthor,
      ip: ip,
      content: trimmedContent,
      time: new Date().toISOString(),
      elementId: elementId,
      parentId: validParentId,
      ...(selectedText ? { selectedText: String(selectedText) } : {}),
      ...(textOffset !== undefined ? { textOffset: Number(textOffset) } : {}),
      ...(textLength !== undefined ? { textLength: Number(textLength) } : {})
    };

    commentsStore[filePath][elementId].push(comment);
    saveComments();

    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// 删除评论
app.delete('/api/comments/:path(*)', (req, res) => {
  try {
    const filePath = req.params.path;
    const { elementId, commentId } = req.body || {};

    if (!elementId || !commentId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!commentsStore[filePath] || !commentsStore[filePath][elementId]) {
      return res.status(404).json({ error: '评论不存在' });
    }

    const comments = commentsStore[filePath][elementId];
    const index = comments.findIndex(c => c.id === commentId);

    if (index === -1) {
      return res.status(404).json({ error: '评论不存在' });
    }

    comments.splice(index, 1);
    saveComments();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

const watcher = chokidar.watch(process.cwd(), {
  ignored: /node_modules|\.git/,
  persistent: true,
  ignoreInitial: true
});

// 文件/目录变更时清除文件树缓存
watcher.on('add', (filePath) => {
  if (isMarkdownFile(filePath)) {
    clearFileTreeCache();
    broadcastChange({ type: 'change', path: filePath });
  }
});

watcher.on('unlink', (filePath) => {
  if (isMarkdownFile(filePath)) {
    clearFileTreeCache();
    broadcastChange({ type: 'change', path: filePath });
  }
});

watcher.on('change', (filePath) => {
  if (path.extname(filePath).match(/\.(md|markdown)$/i)) {
    broadcastChange({ type: 'change', path: filePath });
  }
});

// markdown 文件的添加/删除可能影响文件树结构，清除缓存
watcher.on('addDir', clearFileTreeCache);
watcher.on('unlinkDir', clearFileTreeCache);

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err: any) => {
        if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
          resolve(false);
        } else {
          // 其他错误，认为不可用
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '0.0.0.0');
  });
}

async function findAvailableHttpPort(startPort: number, wsOffset: number): Promise<number> {
  let candidate = startPort;
  // 需要同时保证 HTTP 端口与对应的 WebSocket 端口均可用
  while (true) {
    const httpOk = await isPortAvailable(candidate);
    const wsOk = await isPortAvailable(candidate + wsOffset);
    if (httpOk && wsOk) return candidate;
    candidate += 1;
  }
}

async function start() {
  // 加载评论数据
  loadComments();

  // 选择可用端口（若占用则 +1 重试），同时确保对应的 WebSocket 端口也可用
  const httpPort = await findAvailableHttpPort(PORT, WS_OFFSET);

  // 启动 HTTP 服务
  const server = app.listen(httpPort, () => {
    console.log(`Markdown Viewer server running on http://localhost:${httpPort}`);
  });

  // 启动 WebSocket 服务（固定偏移 wsOffset）
  const wsPort = httpPort + WS_OFFSET;
  wss = new WebSocket.Server({ port: wsPort });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected' }
    }));
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  console.log(`WebSocket server running on ws://localhost:${wsPort}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
