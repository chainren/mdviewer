// AIGC START
const assert = require('assert');
const path = require('path');
const assetUtils = require('../dist/assetUtils.js');

function testParseImageDataUrl() {
    const parsed = assetUtils.parseImageDataUrl('data:image/png;base64,aGVsbG8=', 1024);
    assert.strictEqual(parsed.mime, 'image/png');
    assert.strictEqual(parsed.ext, '.png');
    assert.strictEqual(parsed.buffer.toString('utf8'), 'hello');
}

function testRejectUnsupportedDataUrl() {
    assert.throws(
        () => assetUtils.parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=', 1024),
        /Unsupported image type/
    );
    assert.throws(
        () => assetUtils.parseImageDataUrl('data:text/plain;base64,aGVsbG8=', 1024),
        /Invalid image data URL/
    );
    assert.throws(
        () => assetUtils.parseImageDataUrl('data:image/png;base64,aGVsbG8=', 2),
        /Image is too large/
    );
}

function testBuildAssetTarget() {
    const workspace = path.resolve('/tmp/workspace');
    const markdownPath = path.join(workspace, 'docs', 'note.md');
    const target = assetUtils.buildAssetTarget(workspace, markdownPath, '../bad name?.png', '.png', 1700000000000);

    assert.strictEqual(target.relativeMarkdownPath, 'assets/note/1700000000000-bad-name.png');
    assert.strictEqual(target.workspaceRelativePath, 'docs/assets/note/1700000000000-bad-name.png');
    assert.strictEqual(target.fullPath, path.join(workspace, 'docs', 'assets', 'note', '1700000000000-bad-name.png'));
}

testParseImageDataUrl();
testRejectUnsupportedDataUrl();
testBuildAssetTarget();

console.log('asset utils tests passed');
// AIGC END
