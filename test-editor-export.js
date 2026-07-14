// AIGC START
const assert = require('assert');
const editorExport = require('./src/public/js/editorExport.js');

function testBaseFilename() {
    assert.strictEqual(editorExport.baseFilename('docs/demo.markdown', 'html'), 'demo.html');
    assert.strictEqual(editorExport.baseFilename('', 'md'), 'untitled.md');
}

function testStandaloneHtmlEscapesTitleAndKeepsBody() {
    const html = editorExport.buildStandaloneHtml('a<b>.md', '<h1>标题</h1>');
    assert.ok(html.includes('<title>a&lt;b&gt;</title>'));
    assert.ok(html.includes('<body><h1>标题</h1></body>'));
}

function testWordHtml() {
    const html = editorExport.buildWordHtml('<p>正文</p>');
    assert.ok(html.includes('application') === false);
    assert.ok(html.includes('<p>正文</p>'));
}

testBaseFilename();
testStandaloneHtmlEscapesTitleAndKeepsBody();
testWordHtml();
console.log('editor export tests passed');
// AIGC END
