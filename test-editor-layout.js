// AIGC START
const assert = require('assert');
const layout = require('./src/public/js/editorLayout.js');

function testNormalizeMode() {
    assert.strictEqual(layout.normalizeLayoutMode('edit'), 'edit');
    assert.strictEqual(layout.normalizeLayoutMode('preview'), 'preview');
    assert.strictEqual(layout.normalizeLayoutMode('split'), 'split');
    assert.strictEqual(layout.normalizeLayoutMode('bad'), 'split');
    assert.strictEqual(layout.normalizeLayoutMode(''), 'split');
}

function testClampSplitPercent() {
    assert.strictEqual(layout.clampSplitPercent(10), 25);
    assert.strictEqual(layout.clampSplitPercent(50), 50);
    assert.strictEqual(layout.clampSplitPercent(95), 75);
    assert.strictEqual(layout.clampSplitPercent('bad'), 50);
}

function testBuildLayoutState() {
    assert.deepStrictEqual(layout.buildLayoutState('edit', 60), {
        mode: 'edit',
        editorHidden: false,
        previewHidden: true,
        resizerHidden: true,
        editorBasis: '100%',
        previewBasis: '0%'
    });
    assert.deepStrictEqual(layout.buildLayoutState('preview', 60), {
        mode: 'preview',
        editorHidden: true,
        previewHidden: false,
        resizerHidden: true,
        editorBasis: '0%',
        previewBasis: '100%'
    });
    assert.deepStrictEqual(layout.buildLayoutState('split', 60), {
        mode: 'split',
        editorHidden: false,
        previewHidden: false,
        resizerHidden: false,
        editorBasis: '60%',
        previewBasis: '40%'
    });
}

testNormalizeMode();
testClampSplitPercent();
testBuildLayoutState();

console.log('editor layout tests passed');
// AIGC END
