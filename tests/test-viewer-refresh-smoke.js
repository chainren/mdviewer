// AIGC START
const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('src/public/js/app.js', 'utf8');
assert.match(app, /this\.fileTree\.loadFiles\(\)/);
assert.match(app, /this\.loadFile\(this\.currentFile, true\)/);
assert.match(app, /this\.fileTree\.setCurrentFile\(null\)/);
assert.match(app, /contentBody\.replaceChildren\(state\)/);
assert.match(app, /window\.history\.replaceState/);
console.log('viewer refresh smoke tests passed');
// AIGC END
