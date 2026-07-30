// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.PreviewLinkUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    const previewExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.html', '.htm', '.yaml', '.yml', '.json']);
    const safeExternalProtocols = new Set(['http:', 'https:']);

    function encodePath(value) {
        return value.split('/').filter(Boolean).map(segment => encodeURIComponent(segment)).join('/');
    }

    function getExtension(value) {
        const path = value.split(/[?#]/)[0];
        const index = path.lastIndexOf('.');
        return index < 0 ? '' : path.slice(index).toLowerCase();
    }

    function classifyPreviewLink(href, basePath) {
        if (typeof href !== 'string') return { type: 'unsafe', href: '#' };
        const trimmed = href.trim();
        if (!trimmed) return { type: 'resource', path: basePath, url: `/api/resource/${encodePath(basePath)}` };
        if (trimmed.startsWith('#')) return { type: 'fragment', url: trimmed };
        if (/^(javascript|data|vbscript):/i.test(trimmed)) return { type: 'unsafe', href: '#' };

        let url;
        try {
            url = new URL(trimmed, `https://mdviewer.invalid/${basePath}`);
        } catch (error) {
            return { type: 'unsafe', href: '#' };
        }
        if (!safeExternalProtocols.has(url.protocol.toLowerCase())) {
            return { type: 'unsafe', href: '#' };
        }
        if (url.origin !== 'https://mdviewer.invalid') {
            return { type: 'external', url: trimmed };
        }

        let path;
        try {
            path = decodeURIComponent(url.pathname.replace(/^\//, ''));
        } catch (error) {
            return { type: 'unsafe', href: '#' };
        }
        const suffix = `${url.search}${url.hash}`;
        if (previewExtensions.has(getExtension(path))) {
            return { type: 'document', path, url: `/?file=${encodeURIComponent(path)}${suffix}` };
        }
        return { type: 'resource', path, url: `/api/resource/${encodePath(path)}${suffix}` };
    }

    return { classifyPreviewLink, encodePath };
});
// AIGC END
