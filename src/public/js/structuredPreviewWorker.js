// AIGC START
importScripts('vendor/js-yaml/4.1.1/js-yaml.min.js', 'structuredPreviewUtils.js');

self.onmessage = (event) => {
    try {
        const result = StructuredPreviewUtils.parse(event.data.content, event.data.documentType);
        self.postMessage({ type: 'success', token: event.data.token, tree: result });
    } catch (error) {
        self.postMessage({
            type: 'error',
            token: event.data.token,
            message: error.message || '解析失败',
            line: error.line,
            column: error.column
        });
    }
};
// AIGC END
