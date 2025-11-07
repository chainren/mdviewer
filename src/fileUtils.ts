import * as fs from 'fs';
import * as path from 'path';
import { FileNode } from './types';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.mkdn'];

export function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return MARKDOWN_EXTENSIONS.includes(ext);
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

export function readMarkdownFile(filePath: string): string {
  try {
    const fullPath = path.resolve(filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

export function extractOutline(content: string): Array<{level: number, text: string, id: string}> {
  const outline: Array<{level: number, text: string, id: string}> = [];
  const lines = content.split('\n');
  
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
      
      outline.push({ level, text, id: `heading-${id}-${i}` });
    }
  }
  
  return outline;
}