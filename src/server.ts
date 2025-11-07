import express from 'express';
import * as path from 'path';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import { buildFileTree, readMarkdownFile, extractOutline, isMarkdownFile } from './fileUtils';
import { FileChangeEvent } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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
    const filePath = req.params.path;
    const content = readMarkdownFile(filePath);
    const outline = extractOutline(content);
    
    res.json({
      content,
      outline,
      path: filePath
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// 保存文件接口（仅限 Markdown）
app.post('/api/file/:path(*)', (req, res) => {
  try {
    const rawPath = req.params.path;
    const workspaceRoot = process.cwd();
    const resolved = path.resolve(workspaceRoot, rawPath);

    if (!resolved.startsWith(workspaceRoot)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!isMarkdownFile(resolved)) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const content: string = (req.body && typeof req.body.content === 'string') ? req.body.content : '';
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid content' });
    }

    // 写入文件
    const fs = require('fs');
    fs.writeFileSync(resolved, content, 'utf-8');

    const outline = extractOutline(content);
    return res.json({ success: true, path: rawPath, outline });
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