// AIGC START
const assert = require('assert');
const fs = require('fs');

const preview = fs.readFileSync('src/public/js/htmlPreview.js', 'utf8');
const links = fs.readFileSync('src/public/js/previewLinkUtils.js', 'utf8');
const server = fs.readFileSync('src/server.ts', 'utf8');

assert.match(preview, /setAttribute\('sandbox'/);
const sandbox = preview.match(/setAttribute\('sandbox', '([^']+)'\)/);
assert.ok(sandbox);
assert.doesNotMatch(sandbox[1], /allow-scripts/);
assert.doesNotMatch(sandbox[1], /allow-forms/);
assert.match(sandbox[1], /allow-same-origin/);
assert.match(preview, /querySelectorAll\('script'\)/);
assert.match(preview, /a\[href\], area\[href\]/);
assert.ok(preview.includes("[xlink\\\\:href]"));
assert.match(preview, /querySelectorAll\('\[src\], link\[href\]'\)/);
assert.match(links, /type: 'document'/);
assert.match(links, /type: 'resource'/);
assert.match(links, /type: 'external'/);
assert.match(links, /javascript\|data\|vbscript/);
assert.match(server, /app\.get\('\/api\/resource\/:path\(\*\)'/);
assert.match(server, /resolveWorkspaceResource/);
console.log('HTML preview smoke tests passed');
// AIGC END
