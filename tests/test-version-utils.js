// AIGC START
const assert = require('assert');
const packageJson = require('../package.json');
const version = require('../dist/version.js');

function testVersionMatchesPackage() {
    assert.strictEqual(version.APP_VERSION, packageJson.version);
    assert.strictEqual(version.APP_NAME, 'mdviewer');
    assert.strictEqual(version.getVersionText(), `mdviewer ${packageJson.version}`);
}

function testVersionFlagDetection() {
    assert.strictEqual(version.hasVersionFlag(['--version']), true);
    assert.strictEqual(version.hasVersionFlag(['-v']), true);
    assert.strictEqual(version.hasVersionFlag(['--dir', '.']), false);
}

testVersionMatchesPackage();
testVersionFlagDetection();

console.log('version utils tests passed');
// AIGC END
