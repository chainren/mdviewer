// AIGC START
const assert = require('assert');
const commands = require('./src/public/js/editorCommands.js');

function createTextarea(value, start, end) {
    return {
        value,
        selectionStart: start,
        selectionEnd: end,
        focused: false,
        focus() {
            this.focused = true;
        },
        setRangeText(text, startIndex, endIndex, selectionMode) {
            this.value = this.value.slice(0, startIndex) + text + this.value.slice(endIndex);
            if (selectionMode === 'select') {
                this.selectionStart = startIndex;
                this.selectionEnd = startIndex + text.length;
            } else {
                this.selectionStart = this.selectionEnd = startIndex + text.length;
            }
        }
    };
}

function testWrapSelection() {
    const textarea = createTextarea('hello world', 6, 11);
    commands.wrapSelection(textarea, '**', '**', '文本');
    assert.strictEqual(textarea.value, 'hello **world**');
    assert.strictEqual(textarea.selectionStart, 8);
    assert.strictEqual(textarea.selectionEnd, 13);
    assert.strictEqual(textarea.focused, true);
}

function testSetHeadingReplacesExistingHeading() {
    const textarea = createTextarea('intro\n### Old title\nbody', 11, 11);
    commands.setHeading(textarea, 2);
    assert.strictEqual(textarea.value, 'intro\n## Old title\nbody');
    assert.strictEqual(textarea.selectionStart, 18);
}

function testPrefixSelectedLines() {
    const textarea = createTextarea('a\nb\nc', 0, 3);
    commands.prefixSelectedLines(textarea, '- ', '列表项');
    assert.strictEqual(textarea.value, '- a\n- b\nc');
}

function testInsertTable() {
    const textarea = createTextarea('', 0, 0);
    commands.insertTable(textarea, 2, 3);
    assert.strictEqual(textarea.value, '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n');
}

function testFindAndReplace() {
    const textarea = createTextarea('alpha beta alpha', 0, 0);
    const match = commands.findNext(textarea, 'alpha', 1, false);
    assert.deepStrictEqual(match, { index: 11, end: 16 });

    const replaced = commands.replaceAll('Alpha beta alpha', 'alpha', 'A', false);
    assert.deepStrictEqual(replaced, { value: 'A beta A', count: 2 });
}

function testRichInserts() {
    const linkTarget = createTextarea('OpenAI', 0, 6);
    commands.insertLink(linkTarget, 'https://openai.com', 'OpenAI');
    assert.strictEqual(linkTarget.value, '[OpenAI](https://openai.com)');

    const imageTarget = createTextarea('', 0, 0);
    commands.insertImage(imageTarget, '示例', './assets/example.png');
    assert.strictEqual(imageTarget.value, '![示例](./assets/example.png)');

    const mermaidTarget = createTextarea('', 0, 0);
    commands.insertMermaid(mermaidTarget, 'flowchart TD\n    A[开始] --> B[结束]');
    assert.strictEqual(mermaidTarget.value, '\n```mermaid\nflowchart TD\n    A[开始] --> B[结束]\n```\n\n');
}

function testInsertTextForTabIndent() {
    const textarea = createTextarea('ab', 1, 1);
    commands.insertText(textarea, '    ');
    assert.strictEqual(textarea.value, 'a    b');
    assert.strictEqual(textarea.selectionStart, 5);
}

testWrapSelection();
testSetHeadingReplacesExistingHeading();
testPrefixSelectedLines();
testInsertTable();
testFindAndReplace();
testRichInserts();
testInsertTextForTabIndent();

console.log('editor command tests passed');
// AIGC END
