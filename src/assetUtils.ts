// AIGC START
import * as path from 'path';

const IMAGE_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

export interface ParsedImageDataUrl {
  mime: string;
  ext: string;
  buffer: Buffer;
}

export interface AssetTarget {
  fullPath: string;
  relativeMarkdownPath: string;
  workspaceRelativePath: string;
}

export function parseImageDataUrl(dataUrl: string, maxBytes: number): ParsedImageDataUrl {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(dataUrl || '');
  if (!match) {
    throw new Error('Invalid image data URL');
  }

  const mime = match[1].toLowerCase();
  const ext = IMAGE_TYPES[mime];
  if (!ext) {
    throw new Error('Unsupported image type');
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    throw new Error('Image data is empty');
  }
  if (buffer.length > maxBytes) {
    throw new Error('Image is too large');
  }

  return { mime, ext, buffer };
}

export function sanitizeAssetName(filename: string, fallbackExt: string): string {
  const parsed = path.parse(path.basename(filename || 'image'));
  const name = (parsed.name || 'image')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';
  return `${name}${fallbackExt}`;
}

export function buildAssetTarget(
  workspaceRoot: string,
  markdownFullPath: string,
  originalFilename: string,
  ext: string,
  now: number = Date.now()
): AssetTarget {
  const markdownDir = path.dirname(markdownFullPath);
  const markdownBase = path.parse(markdownFullPath).name || 'document';
  const safeName = sanitizeAssetName(originalFilename, ext);
  const finalName = `${now}-${safeName}`;
  const assetDir = path.join(markdownDir, 'assets', markdownBase);
  const fullPath = path.join(assetDir, finalName);
  const workspaceRelativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
  const relativeMarkdownPath = path.relative(markdownDir, fullPath).replace(/\\/g, '/');

  if (workspaceRelativePath.startsWith('..') || path.isAbsolute(workspaceRelativePath)) {
    throw new Error('Asset target escapes workspace');
  }

  return { fullPath, workspaceRelativePath, relativeMarkdownPath };
}
// AIGC END
