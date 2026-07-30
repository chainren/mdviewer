// AIGC START
const assert = require('assert');
const fs = require('fs');

const server = fs.readFileSync('src/server.ts', 'utf8');
const app = fs.readFileSync('src/public/js/app.js', 'utf8');

assert.match(server, /toWorkspaceRelativePath\(filePath\)/);
assert.match(server, /broadcastChange\(\{ type: 'add'/);
assert.match(server, /broadcastChange\(\{ type: 'unlink'/);
assert.match(server, /broadcastChange\(\{ type: 'change'/);
assert.match(server, /clearFileTreeCache\(\)/);
assert.match(app, /event\.type === 'add' \|\| event\.type === 'unlink'/);
assert.match(app, /event\.type === 'change' && event\.path === this\.currentFile\.path/);
assert.match(app, /event\.type === 'unlink' && event\.path === this\.currentFile\.path/);
assert.match(app, /missing-file-state/);
console.log('file change event contract tests passed');
// AIGC END
