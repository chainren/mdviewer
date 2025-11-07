import * as fs from 'fs';
import * as path from 'path';
import { FileNode } from './types';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn'];

export function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
}

export function getWorkspaceRootReal(): string {
  const root = process.cwd();
  return fs.realpathSync(root);
}

export function resolveWorkspacePath(rawPath: string, options?: { allowCreate?: boolean }): string {
  const allowCreate = !!(options && options.allowCreate);
  const workspaceReal = getWorkspaceRootReal();
  const resolved = path.resolve(workspaceReal, rawPath);

  // 检查是否仍在工作区内（边界安全）
  const rel = path.relative(workspaceReal, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw Object.assign(new Error('Path escapes workspace'), { code: 'EWORKSPACE' });
  }

  // 针对已存在文件，做 realpath 以规避符号链接逃逸；针对新建文件，校验父目录
  try {
    const real = fs.realpathSync(resolved);
    const relReal = path.relative(workspaceReal, real);
    if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
      throw Object.assign(new Error('Real path escapes workspace'), { code: 'EWORKSPACE' });
    }
    return real;
  } catch (err: any) {
    if (err && err.code === 'ENOENT') {
      if (!allowCreate) {
        throw err;
      }
      const parent = path.dirname(resolved);
      const parentReal = fs.realpathSync(parent);
      const relParent = path.relative(workspaceReal, parentReal);
      if (relParent.startsWith('..') || path.isAbsolute(relParent)) {
        throw Object.assign(new Error('Parent escapes workspace'), { code: 'EWORKSPACE' });
      }
      return resolved; // 对于新建文件，返回规范化后的路径
    }
    throw err;
  }
}

export function buildFileTree(dirPath: string, basePath: string = dirPath): FileNode[] {
  const items: FileNode[] = [];
  
  try {
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
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return items.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
}

export function readMarkdownFile(rawPath: string): string {
  const fullPath = resolveWorkspacePath(rawPath);
  if (!isMarkdownFile(fullPath)) {
    const err: any = new Error('Not a markdown file');
    err.code = 'EBADTYPE';
    throw err;
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

export function extractOutline(content: string): Array<{level: number, text: string, id: string}> {
  const outline: Array<{level: number, text: string, id: string}> = [];
  const lines = content.split('\n');
  let headingIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      outline.push({ level, text, id: `heading-${id}-${headingIndex}` });
      headingIndex++;
    }
  }
  
  return outline;
}