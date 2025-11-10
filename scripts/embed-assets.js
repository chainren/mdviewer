// AIGC START
// 生成 src/embeddedAssets.ts，将 src/public 下静态资源打包为代码内嵌映射
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'src', 'public');
const OUT_FILE = path.join(ROOT, 'src', 'embeddedAssets.ts');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

function walk(dir){
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const it of items){
    const p = path.join(dir, it.name);
    if (it.isDirectory()) files.push(...walk(p));
    else files.push(p);
  }
  return files;
}

function gen(){
  const files = walk(PUBLIC_DIR);
  const lines = [];
  lines.push('export type EmbeddedAsset = { content: Buffer | string; type: string };');
  lines.push('export const assets: Record<string, EmbeddedAsset> = {');
  for (const f of files){
    const rel = '/' + path.relative(PUBLIC_DIR, f).replace(/\\/g, '/');
    const ext = path.extname(f).toLowerCase();
    const mime = MIME.get(ext) || 'application/octet-stream';
    const buf = fs.readFileSync(f);
    // 文本按 utf-8 字符串内嵌，二进制使用 base64
    const isText = /\.(html|css|js|svg)$/i.test(ext);
    if (isText){
      const text = buf.toString('utf-8');
      // 使用 JSON 字面量，避免模板字符串导致的 ${} 插值错误
      lines.push(`  ${JSON.stringify(rel)}: { content: ${JSON.stringify(text)}, type: ${JSON.stringify(mime)} },`);
    }else{
      const b64 = buf.toString('base64');
      lines.push(`  ${JSON.stringify(rel)}: { content: Buffer.from(${JSON.stringify(b64)}, 'base64'), type: ${JSON.stringify(mime)} },`);
    }
  }
  lines.push('};');
  const content = lines.join('\n');
  fs.writeFileSync(OUT_FILE, '// AIGC START\n' + content + '\n//AIGC END\n');
  console.log(`Embedded ${files.length} assets to ${OUT_FILE}`);
}

if (require.main === module) gen();
//AIGC END