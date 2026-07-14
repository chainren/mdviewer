// AIGC START
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.MdEditorExport = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function baseFilename(filePath, ext) {
        const raw = String(filePath || 'untitled.md')
            .split('/')
            .pop()
            .replace(/\.(md|markdown|mdown|mkd|mkdn)$/i, '');
        return `${raw || 'untitled'}.${ext}`;
    }

    function buildStandaloneHtml(filePath, bodyHtml) {
        const title = escapeHtml(baseFilename(filePath, 'html').replace(/\.html$/i, ''));
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7;max-width:900px;margin:40px auto;padding:0 24px;color:#1f2937}pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}code{background:#f6f8fa;padding:2px 4px;border-radius:4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d0d7de;padding:6px 10px}img{max-width:100%}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
    }

    function buildWordHtml(bodyHtml) {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:"Microsoft YaHei",SimSun,sans-serif;font-size:12pt;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:5pt 8pt}pre,code{font-family:Consolas,"Courier New",monospace}</style></head><body>${bodyHtml}</body></html>`;
    }

    function downloadBlob(content, mime, filename) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return {
        escapeHtml,
        baseFilename,
        buildStandaloneHtml,
        buildWordHtml,
        downloadBlob
    };
});
// AIGC END
