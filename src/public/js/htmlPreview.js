// AIGC START
class HtmlPreview {
    constructor(container) {
        this.container = container;
    }

    render(content, basePath) {
        const iframe = document.createElement('iframe');
        iframe.className = 'html-preview-frame';
        iframe.title = `HTML 预览：${basePath}`;
        iframe.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
        iframe.referrerPolicy = 'no-referrer';
        iframe.srcdoc = this.prepareDocument(content, basePath);
        this.container.replaceChildren(iframe);
    }

    prepareDocument(content, basePath) {
        if (typeof DOMParser === 'undefined') return content;
        const document = new DOMParser().parseFromString(content, 'text/html');
        document.querySelectorAll('script').forEach(node => node.remove());
        document.querySelectorAll('base, iframe, object, embed, meta[http-equiv]').forEach(node => node.remove());
        document.querySelectorAll('*').forEach(node => {
            Array.from(node.attributes).forEach(attribute => {
                if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
            });
        });

        document.querySelectorAll('a[href], area[href]').forEach(anchor => {
            const result = PreviewLinkUtils.classifyPreviewLink(anchor.getAttribute('href'), basePath);
            if (result.type === 'unsafe') {
                anchor.setAttribute('href', '#');
                anchor.setAttribute('aria-disabled', 'true');
                return;
            }
            anchor.setAttribute('href', result.url);
            if (result.type === 'document') {
                anchor.setAttribute('target', '_top');
            } else if (result.type === 'external' || result.type === 'resource') {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer');
            }
        });

        document.querySelectorAll('[xlink\\:href]').forEach(node => {
            const raw = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            const result = PreviewLinkUtils.classifyPreviewLink(raw, basePath);
            if (result.type === 'unsafe') {
                node.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
            } else if (result.type === 'resource' || result.type === 'document' || result.type === 'external') {
                node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', result.url);
            }
        });

        document.querySelectorAll('[src], link[href]').forEach(node => {
            const attribute = node.hasAttribute('src') ? 'src' : 'href';
            const raw = node.getAttribute(attribute);
            if (!raw || raw.startsWith('#') || /^(https?:|data:|blob:|mailto:)/i.test(raw)) return;
            const result = PreviewLinkUtils.classifyPreviewLink(raw, basePath);
            if (result.type === 'resource') node.setAttribute(attribute, result.url);
            if (result.type === 'unsafe') node.removeAttribute(attribute);
        });

        const base = document.createElement('base');
        base.href = window.location.origin + `/api/resource/${PreviewLinkUtils.encodePath(basePath.split('/').slice(0, -1).join('/'))}/`;
        document.head.prepend(base);
        return `<!doctype html>${document.documentElement.outerHTML}`;
    }
}

window.HtmlPreview = HtmlPreview;
// AIGC END
