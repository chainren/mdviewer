// AIGC START
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fileUtils = require('../dist/fileUtils.js');

async function testDocumentTypes() {
    const supported = ['note.md', 'note.markdown', 'page.HTML', 'page.htm', 'config.yaml', 'config.YML', 'data.JSON'];
    const expected = ['markdown', 'markdown', 'html', 'html', 'yaml', 'yaml', 'json'];
    supported.forEach((file, index) => assert.strictEqual(fileUtils.getDocumentType(file), expected[index]));
    ['data.jsonc', 'data.json5', 'page.xhtml', 'style.css', 'script.js', 'image.png'].forEach(file => {
        assert.strictEqual(fileUtils.getDocumentType(file), undefined, file);
        assert.strictEqual(fileUtils.isPreviewableFile(file), false, file);
    });
}

async function testTreeAndReads() {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'tmp-preview-utils-'));
    try {
        fs.writeFileSync(path.join(root, 'a.md'), '# Markdown');
        fs.writeFileSync(path.join(root, 'b.html'), '<h1>HTML</h1>');
        fs.writeFileSync(path.join(root, 'c.yaml'), 'name: value');
        fs.writeFileSync(path.join(root, 'd.json'), '{"ok":true}');
        fs.writeFileSync(path.join(root, 'hidden.css'), 'body{}');
        const tree = await fileUtils.buildFileTree(root, root);
        assert.deepStrictEqual(tree.map(node => node.name), ['a.md', 'b.html', 'c.yaml', 'd.json']);
        assert.deepStrictEqual(tree.map(node => node.documentType), ['markdown', 'html', 'yaml', 'json']);

        const previousCwd = process.cwd();
        process.chdir(root);
        try {
            const document = fileUtils.readWorkspaceDocument('b.html');
            assert.strictEqual(document.documentType, 'html');
            assert.strictEqual(document.content, '<h1>HTML</h1>');
            assert.throws(() => fileUtils.readMarkdownFile('b.html'), /Not a markdown file/);
        } finally {
            process.chdir(previousCwd);
        }
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

async function testResourceBoundary() {
    const root = fs.mkdtempSync(path.join(process.cwd(), 'tmp-resource-utils-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdviewer-outside-'));
    const previousCwd = process.cwd();
    try {
        fs.writeFileSync(path.join(root, 'asset.css'), 'body{}');
        fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
        fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'escape.txt'));
        process.chdir(root);
        assert.strictEqual(path.basename(fileUtils.resolveWorkspaceResource('asset.css')), 'asset.css');
        assert.throws(() => fileUtils.resolveWorkspaceResource('../secret.txt'), /Path escapes workspace/);
        assert.throws(() => fileUtils.resolveWorkspaceResource('escape.txt'), /Real path escapes workspace/);
    } finally {
        process.chdir(previousCwd);
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
}

(async () => {
    await testDocumentTypes();
    await testTreeAndReads();
    await testResourceBoundary();
    console.log('document utils tests passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
// AIGC END
