// AIGC START
const assert = require('assert');
const app = require('fs').readFileSync('src/public/js/app.js', 'utf8');

['markdown', 'html', 'yaml', 'json'].forEach(documentType => {
    assert.match(app, new RegExp(`documentType === '${documentType}'`));
});
assert.match(app, /this\.renderer\.renderContent/);
assert.match(app, /this\.htmlPreview\.render/);
assert.match(app, /this\.structuredPreview\.render/);
assert.match(app, /setPreviewCapabilities\(documentType\)/);
assert.match(app, /editButton\.hidden = !isMarkdown/);
assert.match(app, /this\.clearCommentState\(\)/);
assert.match(app, /if \(loadToken !== this\.loadToken\) return/);
assert.match(app, /this\.structuredPreview\.cancel\(\)/);
console.log('preview state contract tests passed');
// AIGC END
