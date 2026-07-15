// AIGC START
const assert = require('assert');
const bump = require('./scripts/bump-version.js');

function testParseVersion() {
    assert.deepStrictEqual(bump.parseVersion('1.2.3'), { major: 1, minor: 2, patch: 3 });
    assert.throws(() => bump.parseVersion('1.2'), /版本号必须符合 SemVer/);
}

function testBumpVersion() {
    assert.strictEqual(bump.bumpVersion('1.2.3', 'patch'), '1.2.4');
    assert.strictEqual(bump.bumpVersion('1.2.3', 'minor'), '1.3.0');
    assert.strictEqual(bump.bumpVersion('1.2.3', 'major'), '2.0.0');
    assert.strictEqual(bump.bumpVersion('1.2.3', '1.4.0'), '1.4.0');
    assert.throws(() => bump.bumpVersion('1.2.3', 'bad'), /用法/);
}

function testReplaceVersionSource() {
    const source = "export const APP_VERSION = '1.2.3';";
    assert.strictEqual(
        bump.replaceVersionSource(source, '2.0.0'),
        "export const APP_VERSION = '2.0.0';"
    );
}

testParseVersion();
testBumpVersion();
testReplaceVersionSource();

console.log('version bump tests passed');
// AIGC END
