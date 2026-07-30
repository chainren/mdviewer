import * as fs from 'fs';
import * as path from 'path';
import { DocumentType, FileNode, WorkspaceDocument } from './types';

// AIGC START
const DOCUMENT_EXTENSIONS: Record<string, DocumentType> = {
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
  '.mkd': 'markdown',
  '.mkdn': 'markdown',
  '.html': 'html',
  '.htm': 'html',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
};
// AIGC END

// 文件树扫描时跳过的目录，避免递归遍历大量无关文件
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'tmp',
  '.mdviewer-data',
]);

export function isMarkdownFile(filePath: string): boolean {
  return getDocumentType(filePath) === 'markdown';
}

// AIGC START
export function getDocumentType(filePath: string): DocumentType | undefined {
  return DOCUMENT_EXTENSIONS[path.extname(filePath).toLowerCase()];
}

export function isPreviewableFile(filePath: string): boolean {
  return getDocumentType(filePath) !== undefined;
}
// AIGC END

export function getWorkspaceRootReal(): string {
  const root = process.cwd();
  return fs.realpathSync(root);
}

// AIGC START
export function toWorkspaceRelativePath(filePath: string): string {
  return path.relative(getWorkspaceRootReal(), filePath).split(path.sep).join('/');
}
// AIGC END

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

export async function buildFileTree(dirPath: string, basePath: string = dirPath): Promise<FileNode[]> {
  const items: FileNode[] = [];

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // 跳过无关目录，避免扫描 node_modules/.git 等海量文件
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const children = await buildFileTree(fullPath, basePath);
        if (children.length > 0) {
          items.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children,
            expanded: false
          });
        }
      } else if (entry.isFile() && isPreviewableFile(entry.name)) {
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          documentType: getDocumentType(entry.name),
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
  const document = readWorkspaceDocument(rawPath);
  if (document.documentType !== 'markdown') {
    const err: any = new Error('Not a markdown file');
    err.code = 'EBADTYPE';
    throw err;
  }
  return document.content;
}

// AIGC START
export function readWorkspaceDocument(rawPath: string): WorkspaceDocument {
  const fullPath = resolveWorkspacePath(rawPath);
  const documentType = getDocumentType(fullPath);
  if (!documentType) {
    const err: any = new Error('Not a previewable document');
    err.code = 'EBADTYPE';
    throw err;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const stat = fs.statSync(fullPath);
  return {
    content,
    documentType,
    path: rawPath,
    lastModified: stat.mtimeMs,
  };
}

export function resolveWorkspaceResource(rawPath: string): string {
  const resolved = resolveWorkspacePath(rawPath);
  const relativePath = path.relative(getWorkspaceRootReal(), resolved);
  const segments = relativePath.split(path.sep);
  if (segments.some(segment => segment.startsWith('.') || segment === 'node_modules')) {
    throw Object.assign(new Error('Resource is not accessible'), { code: 'ERESOURCE' });
  }
  if (!fs.statSync(resolved).isFile()) {
    throw Object.assign(new Error('Resource is not a file'), { code: 'ERESOURCE' });
  }
  return resolved;
}
// AIGC END

export function extractOutline(content: string): Array<{level: number, text: string, id: string, line: number}> {
  const outline: Array<{level: number, text: string, id: string, line: number}> = [];
  const lines = content.split('\n');
  let headingIndex = 0;
  let inFence = false;
  let fenceMarker: string | null = null;
  let inIndent = false;
  let prevLineIndented = false;
  let prevLineIsBox = false;
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // 缩进代码块（四空格或 tab）识别
    const isIndented = /^ {4,}\S|^\t/.test(rawLine);
    let isCurrentIndentedBlock = false;

    if (inIndent) {
      if (isIndented || rawLine.trim() === '') {
        isCurrentIndentedBlock = true;
      } else {
        inIndent = false;
      }
    }
    if (!inFence && !inIndent && isIndented) {
      inIndent = true;
      isCurrentIndentedBlock = true;
    }

    // Box drawing check
    const isBox = /^[─-╿]/.test(rawLine.trim());

    // 修复：使用 ```+ 和 ~~~+ 来匹配3个或更多的字符，捕获完整长度
    const fenceMatch = rawLine.match(/^\s*(```+|~~~+)/);
    let isFence = false;

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const fenceIndent = fenceMatch[0].indexOf(marker);
      const restOfLine = rawLine.substring(fenceMatch[0].length).trim();

      // STRICT CLOSING: Must match marker, AND rest of line must be empty
      const isClosing = inFence && 
                        fenceMarker && 
                        marker.startsWith(fenceMarker[0]) && 
                        marker.length >= fenceMarker.length &&
                        restOfLine === '';

      if (isClosing) {
        inFence = false;
        fenceMarker = null;
        isFence = true;
      } else {
        // Opening or Nested
        
        // Heuristic: If previous line was indented block OR box drawing, and this fence is NOT indented (<4 spaces), 
        // treat it as content (ignore fence start).
        if (!inFence && (prevLineIndented || prevLineIsBox) && fenceIndent < 4) {
          isFence = false;
        } else {
          if (!inFence) {
            inFence = true;
            fenceMarker = marker;
            isFence = true;
          } else {
            // Nested fence or content with info string inside fence -> treat as content
            isFence = false; 
          }
        }
      }
    }

    // Update state for next iteration
    // Only update if line is not empty, otherwise keep state
    if (rawLine.trim() !== '') {
        prevLineIndented = isCurrentIndentedBlock;
        prevLineIsBox = isBox;
    }

    if (isCurrentIndentedBlock) continue;
    if (isFence) continue;
    if (inFence) continue;

    const line = rawLine.trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      outline.push({ level, text, id: `heading-${id}-${headingIndex}`, line: i });
      headingIndex++;
    }
  }
  
  return outline;
}
