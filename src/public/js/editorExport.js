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

    function normalizePngOptions(options) {
        const source = options || {};
        const width = Math.max(1, Math.ceil(Number(source.width) || 1));
        const height = Math.max(1, Math.ceil(Number(source.height) || 1));
        return {
            width,
            height,
            background: source.background || '#ffffff',
            styleText: source.styleText || ''
        };
    }

    function buildPngSvg(bodyHtml, options) {
        const normalized = normalizePngOptions(options);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${normalized.width}" height="${normalized.height}" viewBox="0 0 ${normalized.width} ${normalized.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${normalized.width}px;min-height:${normalized.height}px;background:${escapeHtml(normalized.background)};padding:24px;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;">${normalized.styleText ? `<style>${normalized.styleText}</style>` : ''}${bodyHtml}</div></foreignObject></svg>`;
    }

    function collectPngStyleText() {
        if (typeof document === 'undefined') {
            return '';
        }
        return Array.from(document.styleSheets)
            .map((sheet) => {
                try {
                    return Array.from(sheet.cssRules || []).map(rule => rule.cssText).join('\n');
                } catch (error) {
                    return '';
                }
            })
            .filter(Boolean)
            .join('\n');
    }

    function exportElementToPng(element, filename, options) {
        if (!element) {
            return Promise.reject(new Error('没有可导出的预览内容'));
        }
        const width = Math.max(element.scrollWidth, element.clientWidth, 1);
        const height = Math.max(element.scrollHeight, element.clientHeight, 1);
        const computed = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null;
        if (typeof html2canvas === 'function') {
            return html2canvas(element, {
                backgroundColor: computed ? computed.backgroundColor : '#ffffff',
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                scrollX: 0,
                scrollY: 0,
                useCORS: true,
                scale: Math.min(window.devicePixelRatio || 1, 2)
            }).then((canvas) => new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('PNG 生成失败'));
                        return;
                    }
                    downloadBlob(blob, 'image/png', filename);
                    resolve();
                }, 'image/png');
            }));
        }
        if (typeof domtoimage !== 'undefined' && domtoimage.toBlob) {
            return domtoimage.toBlob(element, {
                width,
                height,
                bgcolor: computed ? computed.backgroundColor : '#ffffff',
                cacheBust: true,
                style: {
                    width: `${width}px`,
                    minHeight: `${height}px`,
                    overflow: 'visible'
                }
            }).then((blob) => {
                downloadBlob(blob, 'image/png', filename);
            });
        }
        const clone = element.cloneNode(true);
        const svg = buildPngSvg(clone.innerHTML, Object.assign({}, options, {
            width,
            height,
            background: computed ? computed.backgroundColor : '#ffffff',
            styleText: collectPngStyleText()
        }));
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0);
                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        if (!blob) {
                            reject(new Error('PNG 生成失败'));
                            return;
                        }
                        downloadBlob(blob, 'image/png', filename);
                        resolve();
                    }, 'image/png');
                } catch (error) {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('PNG 渲染失败，请检查是否包含跨域图片'));
            };
            image.src = url;
        });
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
        buildPngSvg,
        exportElementToPng,
        downloadBlob
    };
});
// AIGC END
