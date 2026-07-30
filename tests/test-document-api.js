// AIGC START
const assert = require('assert');
const fs = require('fs');
const server = fs.readFileSync('src/server.ts', 'utf8');
const fileUtils = fs.readFileSync('src/fileUtils.ts', 'utf8');

assert.match(server, /readWorkspaceDocument\(rawPath\)/);
assert.match(server, /documentType/);
assert.match(server, /document\.documentType === 'markdown'/);
assert.match(fileUtils, /Not a markdown file/);
assert.match(fileUtils, /Not a previewable document/);
assert.match(server, /app\.post\('\/api\/file\/:path\(\*\)'/);
assert.match(server, /app\.post\('\/api\/asset\/:\path\(\*\)'/);
console.log('document API contract tests passed');
// AIGC END
