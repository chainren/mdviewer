// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MarkdownLinkUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function isAbsoluteHref(href) {
        return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
    }

    function normalizeSegments(segments) {
        const stack = [];

        for (const segment of segments) {
            if (!segment || segment === '.') {
                continue;
            }

            if (segment === '..') {
                if (stack.length > 0) {
                    stack.pop();
                }
                continue;
            }

            stack.push(segment);
        }

        return stack;
    }

    function resolveDocumentHref(href, basePath) {
        if (typeof href !== 'string') {
            return href;
        }

        const trimmedHref = href.trim();
        if (!trimmedHref) {
            return trimmedHref;
        }

        if (trimmedHref.startsWith('#') || trimmedHref.startsWith('//') || isAbsoluteHref(trimmedHref)) {
            return href;
        }

        const match = trimmedHref.match(/^([^?#]*)([?#].*)?$/);
        const relativePath = match ? match[1] : trimmedHref;
        const hashSuffix = match && match[2] && match[2].startsWith('#') ? match[2] : '';

        if (!relativePath) {
            return href;
        }

        let resolvedSegments;
        if (relativePath.startsWith('/')) {
            resolvedSegments = normalizeSegments(relativePath.split('/'));
        } else {
            const normalizedBasePath = typeof basePath === 'string' ? basePath.split('?')[0].split('#')[0] : '';
            const baseSegments = normalizedBasePath ? normalizedBasePath.split('/').slice(0, -1) : [];
            resolvedSegments = normalizeSegments(baseSegments.concat(relativePath.split('/')));
        }

        return `/?file=${encodeURIComponent(resolvedSegments.join('/'))}${hashSuffix}`;
    }

    return {
        resolveDocumentHref
    };
});
// AIGC END
