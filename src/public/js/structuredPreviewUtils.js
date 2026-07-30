// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.StructuredPreviewUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function createError(message, line, column) {
        const error = new Error(message);
        error.line = line;
        error.column = column;
        return error;
    }

    function scalarValue(value, line, column) {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed.replace(/'/g, '"'));
            } catch (error) {
                throw createError(`无法解析标量值：${trimmed}`, line, column);
            }
        }
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        if (/^(null|~)$/i.test(trimmed)) return null;
        if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
        if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed)) return Number(trimmed);
        return trimmed;
    }

    function nodeForValue(value, key, path, line, column, ancestors = new Set()) {
        if (value && typeof value === 'object' && ancestors.has(value)) {
            return { kind: 'scalar', key, path, value: '[循环引用]', line, column };
        }
        if (Array.isArray(value)) {
            const nextAncestors = new Set(ancestors);
            nextAncestors.add(value);
            return {
                kind: 'array',
                key,
                path,
                line,
                column,
                children: value.map((item, index) => nodeForValue(item, String(index), `${path}.${index}`, line, column, nextAncestors))
            };
        }
        if (value && typeof value === 'object') {
            const nextAncestors = new Set(ancestors);
            nextAncestors.add(value);
            return {
                kind: 'object',
                key,
                path,
                line,
                column,
                children: Object.keys(value).map(childKey => nodeForValue(value[childKey], childKey, `${path}.${childKey}`, line, column, nextAncestors))
            };
        }
        return { kind: 'scalar', key, path, value, line, column };
    }

    function parseJson(source) {
        try {
            return nodeForValue(JSON.parse(source), '', '$', 1, 1);
        } catch (error) {
            const match = String(error.message || '').match(/position (\d+)/i);
            const offset = match ? Number(match[1]) : findJsonErrorOffset(source);
            const before = source.slice(0, offset);
            const line = before.split('\n').length;
            const column = offset - before.lastIndexOf('\n');
            throw createError(`JSON 解析失败：${error.message}`, line, column);
        }
    }

    function findJsonErrorOffset(source) {
        let index = 0;

        function skipWhitespace() {
            while (/\s/.test(source[index] || '')) index += 1;
        }

        function fail() {
            throw index;
        }

        function parseString() {
            if (source[index] !== '"') fail();
            index += 1;
            while (index < source.length) {
                const char = source[index++];
                if (char === '"') return;
                if (char === '\\') {
                    const escape = source[index++];
                    if (escape === 'u') {
                        if (!/^[0-9a-f]{4}$/i.test(source.slice(index, index + 4))) fail();
                        index += 4;
                    } else if (!/["\\/bfnrt]/.test(escape || '')) {
                        fail();
                    }
                } else if (char < ' ') {
                    fail();
                }
            }
            fail();
        }

        function parseValue() {
            skipWhitespace();
            const char = source[index];
            if (char === '"') return parseString();
            if (char === '{') return parseObject();
            if (char === '[') return parseArray();
            if (source.startsWith('true', index)) {
                index += 4;
                return;
            }
            if (source.startsWith('false', index)) {
                index += 5;
                return;
            }
            if (source.startsWith('null', index)) {
                index += 4;
                return;
            }
            const number = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
            if (number) {
                index += number[0].length;
                return;
            }
            fail();
        }

        function parseArray() {
            index += 1;
            skipWhitespace();
            if (source[index] === ']') {
                index += 1;
                return;
            }
            while (index < source.length) {
                parseValue();
                skipWhitespace();
                if (source[index] === ']') {
                    index += 1;
                    return;
                }
                if (source[index] !== ',') fail();
                index += 1;
                skipWhitespace();
            }
            fail();
        }

        function parseObject() {
            index += 1;
            skipWhitespace();
            if (source[index] === '}') {
                index += 1;
                return;
            }
            while (index < source.length) {
                if (source[index] !== '"') fail();
                parseString();
                skipWhitespace();
                if (source[index] !== ':') fail();
                index += 1;
                parseValue();
                skipWhitespace();
                if (source[index] === '}') {
                    index += 1;
                    return;
                }
                if (source[index] !== ',') fail();
                index += 1;
                skipWhitespace();
            }
            fail();
        }

        try {
            parseValue();
            skipWhitespace();
            if (index !== source.length) fail();
        } catch (offset) {
            return typeof offset === 'number' ? offset : index;
        }
        return index;
    }

    function stripComment(value) {
        let quote = null;
        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            if ((char === '"' || char === "'") && value[i - 1] !== '\\') {
                quote = quote === char ? null : (quote || char);
            }
            if (char === '#' && !quote && (i === 0 || /\s/.test(value[i - 1]))) {
                return value.slice(0, i).trimEnd();
            }
        }
        return value.trim();
    }

    function parseYaml(source) {
        const yamlParser = typeof globalThis !== 'undefined' ? globalThis.jsyaml : null;
        if (yamlParser && typeof yamlParser.load === 'function') {
            try {
                return nodeForValue(yamlParser.load(source, { schema: yamlParser.JSON_SCHEMA }), '', '$', 1, 1);
            } catch (error) {
                const mark = error.mark || {};
                throw createError(`YAML 解析失败：${error.reason || error.message}`, (mark.line || 0) + 1, (mark.column || 0) + 1);
            }
        }
        const lines = source.split(/\r?\n/);
        const meaningful = [];
        lines.forEach((raw, index) => {
            if (!raw.trim() || /^\s*(---|\.\.\.)\s*$/.test(raw)) return;
            const indentMatch = raw.match(/^ */);
            const indent = indentMatch ? indentMatch[0].length : 0;
            if (indent % 2 !== 0) throw createError('YAML 缩进必须使用偶数空格', index + 1, indent + 1);
            meaningful.push({ raw, text: stripComment(raw.slice(indent)), indent, line: index + 1, column: indent + 1 });
        });
        if (!meaningful.length) return nodeForValue(null, '', '$', 1, 1);

        function parseBlock(position, indent) {
            if (position >= meaningful.length || meaningful[position].indent < indent) return { value: null, next: position };
            if (meaningful[position].indent > indent) throw createError('YAML 缩进层级不连续', meaningful[position].line, meaningful[position].column);
            const isList = meaningful[position].text === '-' || meaningful[position].text.startsWith('- ');
            const result = isList ? [] : {};
            const startLine = meaningful[position].line;
            while (position < meaningful.length && meaningful[position].indent === indent) {
                const current = meaningful[position];
                if (isList) {
                    if (!(current.text === '-' || current.text.startsWith('- '))) {
                        throw createError('YAML 同一层级不能混用对象和数组', current.line, current.column);
                    }
                    const rest = current.text.slice(1).trim();
                    if (!rest) {
                        const child = parseBlock(position + 1, indent + 2);
                        result.push(child.value);
                        position = child.next;
                        continue;
                    }
                    const pair = rest.match(/^([^:]+):(?:\s*(.*))?$/);
                    if (pair) {
                        const object = {};
                        const key = pair[1].trim();
                        const inline = pair[2] || '';
                        if (inline) object[key] = scalarValue(inline, current.line, current.column);
                        else {
                            const child = parseBlock(position + 1, indent + 2);
                            object[key] = child.value;
                            position = child.next;
                        }
                        while (position < meaningful.length && meaningful[position].indent === indent + 2 && !meaningful[position].text.startsWith('- ')) {
                            const childLine = meaningful[position];
                            const childPair = childLine.text.match(/^([^:]+):(?:\s*(.*))?$/);
                            if (!childPair) throw createError('YAML 对象项缺少冒号', childLine.line, childLine.column);
                            const childKey = childPair[1].trim();
                            const childInline = childPair[2] || '';
                            if (childInline) {
                                object[childKey] = scalarValue(childInline, childLine.line, childLine.column);
                                position += 1;
                            } else {
                                const nested = parseBlock(position + 1, indent + 4);
                                object[childKey] = nested.value;
                                position = nested.next;
                            }
                        }
                        result.push(object);
                    } else {
                        result.push(scalarValue(rest, current.line, current.column));
                        position += 1;
                    }
                    continue;
                }
                const pair = current.text.match(/^([^:]+):(?:\s*(.*))?$/);
                if (!pair) throw createError('YAML 对象项缺少冒号', current.line, current.column);
                const key = pair[1].trim();
                if (!key) throw createError('YAML 对象键不能为空', current.line, current.column);
                const inline = pair[2] || '';
                if (inline) {
                    result[key] = scalarValue(inline, current.line, current.column);
                    position += 1;
                } else {
                    const child = parseBlock(position + 1, indent + 2);
                    result[key] = child.value;
                    position = child.next;
                }
            }
            return { value: result, next: position, line: startLine };
        }

        const parsed = parseBlock(0, meaningful[0].indent);
        if (parsed.next !== meaningful.length) {
            const current = meaningful[parsed.next];
            throw createError('YAML 文档存在无法归属的内容', current.line, current.column);
        }
        return nodeForValue(parsed.value, '', '$', parsed.line || 1, 1);
    }

    function parse(source, type) {
        return type === 'json' ? parseJson(source) : parseYaml(source);
    }

    function formatScalar(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
    }

    return { parse, formatScalar };
});
// AIGC END
