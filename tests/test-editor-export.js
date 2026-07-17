// AIGC START
const assert = require('assert');
const editorExport = require('../src/public/js/editorExport.js');

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

function testParsePngRatio() {
    assert.strictEqual(editorExport.parsePngRatio('9:16'), 9 / 16);
    assert.strictEqual(editorExport.parsePngRatio('1:1'), 1);
    assert.strictEqual(editorExport.parsePngRatio('auto'), null);
    assert.strictEqual(editorExport.parsePngRatio('bad'), null);
}

function testCalculatePngCanvasSize() {
    assert.deepStrictEqual(editorExport.calculatePngCanvasSize(900, 2400, {
        ratio: '9:16',
        cropToRatio: false
    }), { width: 900, height: 2400 });
    assert.deepStrictEqual(editorExport.calculatePngCanvasSize(900, 2400, {
        ratio: '9:16',
        cropToRatio: true
    }), { width: 900, height: 1600 });
    assert.deepStrictEqual(editorExport.calculatePngCanvasSize(900, 300, {
        ratio: '1:1',
        cropToRatio: true
    }), { width: 900, height: 900 });
}

function testDownloadHelpersAreAvailable() {
    assert.strictEqual(typeof editorExport.downloadDataUrl, 'function');
    assert.strictEqual(typeof editorExport.downloadBlob, 'function');
}

testBaseFilename();
testStandaloneHtmlEscapesTitleAndKeepsBody();
testWordHtml();
testBuildPngSvg();
testParsePngRatio();
testCalculatePngCanvasSize();
testDownloadHelpersAreAvailable();
console.log('editor export tests passed');
// AIGC END
