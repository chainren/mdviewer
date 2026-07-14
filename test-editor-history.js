// AIGC START
const assert = require('assert');
const { createHistoryManager } = require('./src/public/js/editorHistory.js');

function testUndoRedo() {
    const history = createHistoryManager(3);
    history.reset('a');
    history.push('ab');
    history.push('abc');

    assert.strictEqual(history.undo(), 'ab');
    assert.strictEqual(history.undo(), 'a');
    assert.strictEqual(history.undo(), 'a');
    assert.strictEqual(history.redo(), 'ab');
    assert.strictEqual(history.redo(), 'abc');
    assert.strictEqual(history.redo(), 'abc');
}

function testMaxHistoryAndBranching() {
    const history = createHistoryManager(3);
    history.reset('one');
    history.push('two');
    history.push('three');
    history.push('four');
    assert.deepStrictEqual(history.entries(), ['two', 'three', 'four']);

    assert.strictEqual(history.undo(), 'three');
    history.push('branch');
    assert.deepStrictEqual(history.entries(), ['two', 'three', 'branch']);
    assert.strictEqual(history.redo(), 'branch');
}

testUndoRedo();
testMaxHistoryAndBranching();
console.log('editor history tests passed');
// AIGC END
