// AIGC START
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('src/public/index.html', 'utf8');
const app = fs.readFileSync('src/public/js/app.js', 'utf8');
const fileTree = fs.readFileSync('src/public/js/fileTree.js', 'utf8');
const structured = fs.readFileSync('src/public/js/structuredPreview.js', 'utf8');
const structuredWorker = fs.readFileSync('src/public/js/structuredPreviewWorker.js', 'utf8');
const htmlPreview = fs.readFileSync('src/public/js/htmlPreview.js', 'utf8');
const css = fs.readFileSync('src/public/css/main.css', 'utf8');
const server = fs.readFileSync('src/server.ts', 'utf8');

assert.match(html, /structuredPreviewUtils\.js/);
assert.match(html, /structuredPreview\.js/);
assert.match(structured, /structuredPreviewWorker\.js/);
assert.match(structuredWorker, /importScripts/);
assert.match(html, /htmlPreview\.js/);
assert.match(html, /js-yaml\/4\.1\.1\/js-yaml\.min\.js/);
assert.match(app, /setPreviewCapabilities/);
assert.match(app, /documentType === 'markdown'/);
assert.match(app, /event\.path === this\.currentFile\.path/);
assert.match(app, /this\.structuredPreview\.cancel\(\)/);
assert.match(app, /handleCurrentFileDeleted/);
assert.match(app, /searchParams\.delete\('file'\)/);
assert.match(app, /requestToken === this\.loadToken/);
assert.match(fileTree, /isMarkdownPath/);
assert.match(fileTree, /未找到可预览文件/);
assert.match(fileTree, /getDocumentIcon/);
assert.match(structured, /createElement\('details'\)/);
assert.match(structured, /cancel\(\)/);
assert.match(structured, /lineElement\.textContent/);
assert.match(structured, /parse-error-line/);
assert.match(htmlPreview, /sandbox/);
assert.match(htmlPreview, /allow-popups/);
assert.match(htmlPreview, /script/);
const sandbox = htmlPreview.match(/setAttribute\('sandbox', '([^']+)'\)/);
assert.ok(sandbox, 'HTML preview must set sandbox flags');
assert.doesNotMatch(sandbox[1], /allow-scripts/);
assert.doesNotMatch(sandbox[1], /allow-forms/);
assert.match(server, /event\.type === 'unlink'|type: 'unlink'/);
assert.match(css, /\.structured-tree/);
assert.match(css, /\.html-preview-frame/);
console.log('viewer smoke tests passed');
// AIGC END
