// AIGC START
const assert = require('assert');
const { resolveDocumentHref } = require('../src/public/js/linkUtils.js');

function testResolveRelativeLink() {
    assert.strictEqual(
        resolveDocumentHref('./chapter.md', 'link-demo/guide/intro.md'),
        '/?file=link-demo%2Fguide%2Fchapter.md'
    );
    assert.strictEqual(
        resolveDocumentHref('../chapter.md', 'link-demo/guide/sub/intro.md'),
        '/?file=link-demo%2Fguide%2Fchapter.md'
    );
    assert.strictEqual(
        resolveDocumentHref('/link-demo/note.md', 'link-demo/guide/intro.md'),
        '/?file=link-demo%2Fnote.md'
    );
}

function testPreserveAbsoluteAndExternalLinks() {
    assert.strictEqual(
        resolveDocumentHref('/absolute/path.md', 'guide/intro.md'),
        '/?file=absolute%2Fpath.md'
    );
    assert.strictEqual(
        resolveDocumentHref('https://example.com/doc.md', 'guide/intro.md'),
        'https://example.com/doc.md'
    );
    assert.strictEqual(
        resolveDocumentHref('#section', 'guide/intro.md'),
        '#section'
    );
}

testResolveRelativeLink();
testPreserveAbsoluteAndExternalLinks();

console.log('link utils tests passed');
// AIGC END
