// AIGC START
const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

function request(port, requestPath) {
    return new Promise((resolve, reject) => {
        const request = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve({
                status: response.statusCode,
                headers: response.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        request.on('error', reject);
    });
}

function encodeWorkspacePath(workspacePath) {
    return workspacePath.split(path.sep).map(segment => encodeURIComponent(segment)).join('/');
}

async function main() {
    const fixtureRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-html-resource-api-'));
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdviewer-resource-api-outside-'));
    const child = childProcess.spawn(process.execPath, ['dist/server.js', '--port', '39321'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { output += chunk.toString(); });

    try {
        fs.writeFileSync(path.join(fixtureRoot, 'page.html'), '<h1>page</h1>');
        fs.writeFileSync(path.join(fixtureRoot, 'style.css'), 'body{color:red}');
        fs.writeFileSync(path.join(fixtureRoot, '.secret'), 'hidden');
        fs.writeFileSync(path.join(outsideRoot, 'secret.txt'), 'outside');
        fs.symlinkSync(path.join(outsideRoot, 'secret.txt'), path.join(fixtureRoot, 'escape.txt'));

        const startedAt = Date.now();
        while (!/Markdown Viewer server running on http:\/\/localhost:(\d+)/.test(output)) {
            if (child.exitCode !== null) {
                if (/未找到可用端口|EACCES|EPERM/.test(output)) {
                    console.log('HTML resource API tests skipped: 当前环境禁止监听本地端口');
                    return;
                }
                throw new Error(`server exited: ${output}`);
            }
            if (Date.now() - startedAt > 10000) throw new Error(`server start timeout: ${output}`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        const port = Number(output.match(/Markdown Viewer server running on http:\/\/localhost:(\d+)/)[1]);
        const fixturePath = path.relative(process.cwd(), fixtureRoot).split(path.sep).join('/');

        const document = await request(port, `/api/file/${encodeWorkspacePath(`${fixturePath}/page.html`)}`);
        assert.strictEqual(document.status, 200);
        assert.strictEqual(JSON.parse(document.body).documentType, 'html');

        const resource = await request(port, `/api/resource/${encodeWorkspacePath(`${fixturePath}/style.css`)}`);
        assert.strictEqual(resource.status, 200);
        assert.match(resource.headers['content-type'], /^text\/css/);
        assert.strictEqual(resource.body, 'body{color:red}');

        const traversal = await request(port, `/api/resource/${encodeURIComponent('../package.json')}`);
        assert.strictEqual(traversal.status, 404);
        const hidden = await request(port, `/api/resource/${encodeWorkspacePath(`${fixturePath}/.secret`)}`);
        assert.strictEqual(hidden.status, 404);
        const symlink = await request(port, `/api/resource/${encodeWorkspacePath(`${fixturePath}/escape.txt`)}`);
        assert.strictEqual(symlink.status, 404);
        console.log('HTML resource API tests passed');
    } finally {
        child.kill('SIGTERM');
        fs.rmSync(fixtureRoot, { recursive: true, force: true });
        fs.rmSync(outsideRoot, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
// AIGC END
