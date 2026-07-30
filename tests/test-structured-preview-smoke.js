// AIGC START
const assert = require('assert');
const fs = require('fs');

const yamlAsset = fs.readFileSync('src/public/js/vendor/js-yaml/4.1.1/js-yaml.min.js', 'utf8');
const worker = fs.readFileSync('src/public/js/structuredPreviewWorker.js', 'utf8');
const preview = fs.readFileSync('src/public/js/structuredPreview.js', 'utf8');

assert.ok(yamlAsset.length > 10000, 'vendored js-yaml asset should be a real browser build');
assert.doesNotMatch(yamlAsset.slice(0, 200), /<html|<!doctype/i);
assert.match(worker, /importScripts\('vendor\/js-yaml\/4\.1\.1\/js-yaml\.min\.js', 'structuredPreviewUtils\.js'\)/);
assert.match(worker, /self\.postMessage/);
assert.match(preview, /this\.cancel\(\)/);
assert.match(preview, /async renderTree\(root, token\)/);
assert.match(preview, /renderedCount % 100 === 0/);
assert.match(preview, /yieldToBrowser/);
assert.match(preview, /details\.open = isRoot \|\| depth < 2/);
console.log('structured preview smoke tests passed');
// AIGC END
