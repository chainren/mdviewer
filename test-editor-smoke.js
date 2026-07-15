// AIGC START
const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('src/public/editor.html', 'utf8');
const editorJs = fs.readFileSync('src/public/js/editor.js', 'utf8');

function assertContains(source, pattern, message) {
    assert.ok(pattern.test(source), message);
}

function testToolbarEntrypoints() {
    [
        'btn-layout-edit',
        'btn-layout-split',
        'btn-layout-preview',
        'split-resizer',
        'btn-export-png'
    ].forEach(id => {
        assertContains(html, new RegExp(`id="${id}"`), `缺少编辑器入口：${id}`);
    });
}

function testScriptWiring() {
    assertContains(html, /js\/vendor\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/, '缺少 html2canvas 引入');
    assertContains(html, /js\/vendor\/dom-to-image-more\/3\.5\.0\/dom-to-image-more\.min\.js/, '缺少 dom-to-image-more 引入');
    assertContains(html, /js\/editorLayout\.js/, '缺少 editorLayout.js 引入');
    assertContains(editorJs, /exportPng/, '缺少 PNG 导出绑定');
    assertContains(editorJs, /applyLayoutMode/, '缺少布局模式绑定');
    assertContains(editorJs, /startSplitResize/, '缺少拖拽分栏绑定');
}

testToolbarEntrypoints();
testScriptWiring();

console.log('editor smoke tests passed');
// AIGC END
