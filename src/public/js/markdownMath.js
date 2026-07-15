// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MarkdownMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function protectMath(text) {
        const placeholders = [];
        let counter = 0;
        const source = String(text || '');
        const parts = source.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g);
        const protectedText = parts.map(part => {
            if (part.startsWith('```') || part.startsWith('~~~') || part.startsWith('`')) {
                return part;
            }
            return part
                .replace(/\$\$[\s\S]+?\$\$/g, store)
                .replace(/(^|[^\\\w])\$([^$\n\s][^$\n]*?[^$\n\s])\$/g, (match, prefix) => prefix + store(match.slice(prefix.length)));
        }).join('');

        return { text: protectedText, placeholders };

        function store(match) {
            const key = `<!--MATH_${counter++}-->`;
            placeholders.push({ key, value: match });
            return key;
        }
    }

    function restoreMath(html, placeholders) {
        return (placeholders || []).reduce((result, item) => {
            return result.split(item.key).join(item.value);
        }, String(html || ''));
    }

    function renderMath(container) {
        if (typeof renderMathInElement !== 'function' || !container) {
            return;
        }
        renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false
        });
    }

    return { protectMath, restoreMath, renderMath };
});
// AIGC END
