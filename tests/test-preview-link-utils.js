// AIGC START
const assert = require('assert');
const { classifyPreviewLink } = require('../src/public/js/previewLinkUtils.js');

function testDocumentLinks() {
    assert.deepStrictEqual(classifyPreviewLink('../data.json#root', 'docs/pages/index.html'), {
        type: 'document', path: 'docs/data.json', url: '/?file=docs%2Fdata.json#root'
    });
    assert.strictEqual(classifyPreviewLink('./style.css', 'docs/pages/index.html').type, 'resource');
    assert.strictEqual(classifyPreviewLink('https://example.com', 'index.html').type, 'external');
    assert.strictEqual(classifyPreviewLink('#section', 'index.html').type, 'fragment');
}

function testUnsafeLinks() {
    assert.strictEqual(classifyPreviewLink('javascript:alert(1)', 'index.html').type, 'unsafe');
    assert.strictEqual(classifyPreviewLink('java\nscript:alert(1)', 'index.html').type, 'unsafe');
    assert.strictEqual(classifyPreviewLink('file:///etc/passwd', 'index.html').type, 'unsafe');
    assert.strictEqual(classifyPreviewLink('chrome-extension://abc/page.html', 'index.html').type, 'unsafe');
    assert.strictEqual(classifyPreviewLink('data:text/html,evil', 'index.html').type, 'unsafe');
    assert.strictEqual(classifyPreviewLink('%E0%A4%A', 'index.html').type, 'unsafe');
}

testDocumentLinks();
testUnsafeLinks();
console.log('preview link utils tests passed');
// AIGC END
