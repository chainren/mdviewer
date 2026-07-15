// AIGC START
const assert = require('assert');
const math = require('./src/public/js/markdownMath.js');

function testProtectAndRestoreMath() {
    const source = '公式 $a_b$ 和 $$c^2$$\n\n```js\nconst price = "$5";\n```';
    const result = math.protectMath(source);
    assert.strictEqual(result.placeholders.length, 2);
    assert.ok(!result.text.includes('$a_b$'));
    assert.ok(result.text.includes('const price = "$5";'));
    assert.strictEqual(math.restoreMath(result.text, result.placeholders), source);
}

function testNoMathWhenOnlyCurrency() {
    const source = 'Price is $5 and code `const x = "$y"`.';
    const result = math.protectMath(source);
    assert.strictEqual(result.placeholders.length, 0);
    assert.strictEqual(result.text, source);
}

testProtectAndRestoreMath();
testNoMathWhenOnlyCurrency();
console.log('markdown math tests passed');
// AIGC END
