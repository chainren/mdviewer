// AIGC START
const assert = require('assert');
global.jsyaml = require('../src/public/js/vendor/js-yaml/4.1.1/js-yaml.min.js');
const structured = require('../src/public/js/structuredPreviewUtils.js');

function testJsonTree() {
    const tree = structured.parse('{"name":"demo","items":[1,true,null]}', 'json');
    assert.strictEqual(tree.kind, 'object');
    assert.strictEqual(tree.children[0].value, 'demo');
    assert.strictEqual(tree.children[1].kind, 'array');
    assert.strictEqual(tree.children[1].children[1].value, true);
}

function testYamlTree() {
    const tree = structured.parse('name: demo\nwhen: 2026-07-30\nitems:\n  - one\n  - two\nactive: true', 'yaml');
    assert.strictEqual(tree.kind, 'object');
    assert.strictEqual(tree.children.find(node => node.key === 'name').value, 'demo');
    assert.strictEqual(tree.children.find(node => node.key === 'when').value, '2026-07-30');
    assert.strictEqual(tree.children.find(node => node.key === 'items').kind, 'array');
    assert.strictEqual(tree.children.find(node => node.key === 'active').value, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(tree, 'value'), false);
}

function testYamlAliasesAndCycles() {
    const tree = structured.parse('node: &node\n  name: demo\n  self: *node', 'yaml');
    const node = tree.children.find(child => child.key === 'node');
    assert.strictEqual(node.kind, 'object');
    assert.strictEqual(node.children.find(child => child.key === 'self').value, '[循环引用]');
}

function testParseErrors() {
    assert.throws(() => structured.parse('{"broken":}', 'json'), error => error.line >= 1 && error.column >= 1);
    assert.throws(() => structured.parse('{"ok": true,\n"broken": }', 'json'), error => error.line === 2 && error.column >= 1);
    assert.throws(() => structured.parse('broken: [', 'yaml'), error => error.line >= 1 && error.column >= 1);
}

function testSafeScalarFormatting() {
    assert.strictEqual(structured.formatScalar('<script>alert(1)</script>'), '"<script>alert(1)</script>"');
    assert.strictEqual(structured.formatScalar(null), 'null');
}

testJsonTree();
testYamlTree();
testYamlAliasesAndCycles();
testParseErrors();
testSafeScalarFormatting();
console.log('structured preview tests passed');
// AIGC END
