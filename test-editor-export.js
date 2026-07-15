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

function testBuildPngSvg() {
    const svg = editorExport.buildPngSvg('<h1>标题</h1>', {
        width: 320,
        height: 240,
        background: '#ffffff'
    });
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('width="320"'));
    assert.ok(svg.includes('height="240"'));
    assert.ok(svg.includes('<foreignObject'));
    assert.ok(svg.includes('<h1>标题</h1>'));
}

testBaseFilename();
testStandaloneHtmlEscapesTitleAndKeepsBody();
testWordHtml();
testBuildPngSvg();
console.log('editor export tests passed');
// AIGC END
