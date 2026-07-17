// AIGC START
const assert = require('assert');
const portUtils = require('../dist/portUtils.js');

async function testParsePort() {
    assert.strictEqual(portUtils.parsePortValue(undefined, undefined, 3001, 5080), 3001);
    assert.strictEqual(portUtils.parsePortValue('4000', undefined, 3001, 5080), 4000);
    assert.strictEqual(portUtils.parsePortValue(undefined, '4100', 3001, 5080), 4100);

    assert.throws(
        () => portUtils.parsePortValue('abc', undefined, 3001, 5080),
        /--port 必须是 0 到 60455 之间的整数/
    );
    assert.throws(
        () => portUtils.parsePortValue('65000', undefined, 3001, 5080),
        /--port 必须是 0 到 60455 之间的整数/
    );
}

async function testFindAvailablePortStopsBeforeInvalidSocketPort() {
    let checkedPorts = [];
    await assert.rejects(
        () => portUtils.findAvailableHttpPort(60454, 5080, async (port) => {
            checkedPorts.push(port);
            return false;
        }),
        /未找到可用端口：HTTP 端口范围 60454-60455，且需预留 WebSocket 偏移 5080/
    );
    assert.deepStrictEqual(checkedPorts, [60454, 65534, 60455, 65535]);
}

async function testFindAvailablePortReturnsFirstPair() {
    const checkedPorts = [];
    const port = await portUtils.findAvailableHttpPort(3001, 5080, async (candidate) => {
        checkedPorts.push(candidate);
        return candidate === 3003 || candidate === 8083;
    });
    assert.strictEqual(port, 3003);
    assert.deepStrictEqual(checkedPorts, [3001, 8081, 3002, 8082, 3003, 8083]);
}

async function main() {
    await testParsePort();
    await testFindAvailablePortStopsBeforeInvalidSocketPort();
    await testFindAvailablePortReturnsFirstPair();
    console.log('port utils tests passed');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
// AIGC END
