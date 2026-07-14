// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MdEditorCommands = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function focus(textarea) {
        if (textarea && typeof textarea.focus === 'function') {
            textarea.focus();
        }
    }

    function replaceRange(textarea, text, start, end, selectionMode) {
        if (typeof textarea.setRangeText === 'function') {
            textarea.setRangeText(text, start, end, selectionMode || 'end');
            return;
        }

        textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
        if (selectionMode === 'select') {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + text.length;
        } else {
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
        }
    }

    function getSelection(textarea, fallback) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        const selected = textarea.value.slice(start, end) || fallback || '';
        return { start, end, selected };
    }

    function wrapSelection(textarea, before, after, fallback) {
        const selection = getSelection(textarea, fallback);
        const text = before + selection.selected + after;
        replaceRange(textarea, text, selection.start, selection.end, 'select');
        textarea.selectionStart = selection.start + before.length;
        textarea.selectionEnd = textarea.selectionStart + selection.selected.length;
        focus(textarea);
    }

    function getCurrentLineRange(textarea) {
        const pos = textarea.selectionStart || 0;
        const value = textarea.value;
        const lineStart = value.lastIndexOf('\n', Math.max(pos - 1, 0)) + 1;
        const nextLine = value.indexOf('\n', lineStart);
        const lineEnd = nextLine === -1 ? value.length : nextLine;
        return { lineStart, lineEnd };
    }

    function setHeading(textarea, level) {
        const normalizedLevel = Math.min(Math.max(parseInt(level, 10) || 1, 1), 6);
        const range = getCurrentLineRange(textarea);
        const currentLine = textarea.value.slice(range.lineStart, range.lineEnd);
        const newLine = '#'.repeat(normalizedLevel) + ' ' + currentLine.replace(/^#{0,6}\s*/, '');
        replaceRange(textarea, newLine, range.lineStart, range.lineEnd, 'end');
        focus(textarea);
    }

    function prefixSelectedLines(textarea, prefix, fallback) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        const firstLineStart = textarea.value.lastIndexOf('\n', Math.max(start - 1, 0)) + 1;
        const selected = textarea.value.slice(firstLineStart, end) || fallback || '';
        const prefixed = selected.split('\n').map(function(line) {
            return line ? prefix + line : line;
        }).join('\n');
        replaceRange(textarea, prefixed, firstLineStart, end, 'end');
        focus(textarea);
    }

    function insertFence(textarea, language, placeholder) {
        const selection = getSelection(textarea, placeholder || '');
        const code = '\n```' + (language || '') + '\n' + selection.selected + '\n```\n\n';
        replaceRange(textarea, code, selection.start, selection.end, 'end');
        focus(textarea);
    }

    function insertText(textarea, text) {
        const selection = getSelection(textarea, '');
        replaceRange(textarea, text, selection.start, selection.end, 'end');
        focus(textarea);
    }

    function insertTable(textarea, rows, cols) {
        const safeRows = Math.min(Math.max(parseInt(rows, 10) || 2, 1), 20);
        const safeCols = Math.min(Math.max(parseInt(cols, 10) || 2, 1), 20);
        const header = '| ' + Array.from({ length: safeCols }, function(_, index) {
            return '列' + (index + 1);
        }).join(' | ') + ' |';
        const separator = '| ' + Array.from({ length: safeCols }, function() {
            return '---';
        }).join(' | ') + ' |';
        const row = '| ' + Array.from({ length: safeCols }, function() {
            return '内容';
        }).join(' | ') + ' |';
        const bodyRows = Array.from({ length: Math.max(safeRows - 1, 0) }, function() {
            return row;
        });
        const markdown = '\n' + [header, separator].concat(bodyRows).join('\n') + '\n';
        const selection = getSelection(textarea, '');
        replaceRange(textarea, markdown, selection.start, selection.end, 'end');
        focus(textarea);
    }

    function escapeBrackets(text) {
        return String(text || '').replace(/\]/g, '\\]');
    }

    function insertLink(textarea, url, label) {
        const selection = getSelection(textarea, label || '链接文本');
        replaceRange(textarea, '[' + escapeBrackets(selection.selected) + '](' + url + ')', selection.start, selection.end, 'end');
        focus(textarea);
    }

    function insertImage(textarea, alt, url) {
        const selection = getSelection(textarea, '');
        replaceRange(textarea, '![' + escapeBrackets(alt || '图片') + '](' + url + ')', selection.start, selection.end, 'end');
        focus(textarea);
    }

    function insertMermaid(textarea, code) {
        const selection = getSelection(textarea, '');
        const source = String(code || '').trim();
        const markdown = '\n```mermaid\n' + source + '\n```\n\n';
        replaceRange(textarea, markdown, selection.start, selection.end, 'end');
        focus(textarea);
    }

    function escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function findNext(textarea, query, startIndex, caseSensitive) {
        if (!query) {
            return null;
        }
        const value = textarea.value || '';
        const source = caseSensitive ? value : value.toLowerCase();
        const needle = caseSensitive ? query : query.toLowerCase();
        let index = source.indexOf(needle, Math.max(startIndex || 0, 0));
        if (index === -1 && startIndex > 0) {
            index = source.indexOf(needle, 0);
        }
        if (index === -1) {
            return null;
        }
        return { index, end: index + query.length };
    }

    function selectMatch(textarea, match) {
        if (!match) {
            return false;
        }
        textarea.selectionStart = match.index;
        textarea.selectionEnd = match.end;
        focus(textarea);
        return true;
    }

    function replaceSelection(textarea, replacement) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        if (end <= start) {
            return false;
        }
        replaceRange(textarea, replacement, start, end, 'end');
        focus(textarea);
        return true;
    }

    function replaceAll(value, query, replacement, caseSensitive) {
        if (!query) {
            return { value, count: 0 };
        }
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escapeRegExp(query), flags);
        let count = 0;
        const nextValue = String(value || '').replace(regex, function() {
            count += 1;
            return replacement;
        });
        return { value: nextValue, count };
    }

    return {
        wrapSelection,
        setHeading,
        prefixSelectedLines,
        insertFence,
        insertText,
        insertTable,
        insertLink,
        insertImage,
        insertMermaid,
        findNext,
        selectMatch,
        replaceSelection,
        replaceAll
    };
});
// AIGC END
