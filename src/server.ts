import express from 'express';
import * as path from 'path';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import { buildFileTree, readMarkdownFile, extractOutline, isMarkdownFile, resolveWorkspacePath } from './fileUtils';
import { FileChangeEvent } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

const wss = new WebSocket.Server({ port: 8080 });

function broadcastChange(event: FileChangeEvent) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'file-change',
        data: event
      }));
    }
  });
}

app.get('/api/files', (req, res) => {
  try {
    const currentDir = process.cwd();
    const fileTree = buildFileTree(currentDir);
    res.json(fileTree);
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
    if (clientMtime && currentStat && Math.round(clientMtime) !== Math.round(currentStat.mtimeMs)) {
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

const watcher = chokidar.watch(process.cwd(), {
  ignored: /node_modules|\.git/,
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (filePath) => {
  if (path.extname(filePath).match(/\.(md|markdown)$/i)) {
    broadcastChange({ type: 'change', path: filePath });
  }
});

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

app.listen(PORT, () => {
  console.log(`Markdown Viewer server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8080`);
});