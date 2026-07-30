// AIGC START
class StructuredPreview {
    constructor(container) {
        this.container = container;
        this.worker = null;
        this.renderToken = 0;
    }

    async render(content, documentType) {
        this.cancel();
        const token = this.renderToken;
        this.container.innerHTML = '<div class="loading structured-loading">正在解析结构...</div>';

        try {
            const tree = await this.parse(content, documentType, token);
            if (token !== this.renderToken) return;
            await this.renderTree(tree, token);
        } catch (error) {
            if (token !== this.renderToken) return;
            this.renderError(content, documentType, error);
        }
    }

    parse(content, documentType, token) {
        if (typeof Worker === 'undefined') {
            return Promise.resolve().then(() => StructuredPreviewUtils.parse(content, documentType));
        }

        return new Promise((resolve, reject) => {
            const worker = new Worker('js/structuredPreviewWorker.js');
            this.worker = worker;
            worker.onmessage = (event) => {
                if (event.data.token !== token) return;
                if (this.worker === worker) this.disposeWorker();
                if (event.data.type === 'success') {
                    resolve(event.data.tree);
                } else {
                    const error = new Error(event.data.message || '解析失败');
                    error.line = event.data.line;
                    error.column = event.data.column;
                    reject(error);
                }
            };
            worker.onerror = (event) => {
                if (token !== this.renderToken) return;
                if (this.worker === worker) this.disposeWorker();
                reject(new Error(event.message || '结构化数据解析失败'));
            };
            worker.postMessage({ content, documentType, token });
        });
    }

    cancel() {
        this.renderToken += 1;
        this.disposeWorker();
    }

    disposeWorker() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    async renderTree(root, token) {
        const tree = document.createElement('div');
        tree.className = 'structured-tree';
        this.container.replaceChildren(tree);

        const pending = [{ node: root, parent: tree, depth: 0, isRoot: true }];
        let cursor = 0;
        let renderedCount = 0;
        while (cursor < pending.length) {
            if (token !== this.renderToken) return;
            const current = pending[cursor++];
            const rendered = this.createNodeElement(current.node, current.depth, current.isRoot);
            current.parent.appendChild(rendered.element);
            if (rendered.childrenContainer) {
                rendered.children.forEach((child, index) => {
                    pending.push({
                        node: child,
                        parent: rendered.childrenContainer,
                        depth: current.depth + 1,
                        isRoot: false,
                        order: index
                    });
                });
            }
            renderedCount += 1;
            if (renderedCount % 100 === 0) {
                await this.yieldToBrowser();
            }
        }
    }

    yieldToBrowser() {
        return new Promise(resolve => {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(resolve, { timeout: 50 });
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    createNodeElement(node, depth, isRoot = false) {
        if (node.kind === 'object' || node.kind === 'array') {
            const details = document.createElement('details');
            details.className = `structured-node structured-${node.kind}`;
            details.open = isRoot || depth < 2;

            const summary = document.createElement('summary');
            summary.className = 'structured-summary';
            const key = document.createElement('span');
            key.className = 'structured-key';
            key.textContent = node.key || '$';
            const type = document.createElement('span');
            type.className = 'structured-type';
            type.textContent = node.kind === 'array' ? `[${node.children.length}]` : `{${node.children.length}}`;
            summary.append(key, type);
            details.appendChild(summary);

            const children = document.createElement('div');
            children.className = 'structured-children';
            details.appendChild(children);
            return { element: details, childrenContainer: children, children: node.children };
        }

        const row = document.createElement('div');
        row.className = 'structured-value';
        const key = document.createElement('span');
        key.className = 'structured-key';
        key.textContent = node.key || '$';
        const value = document.createElement('span');
        value.className = `structured-scalar structured-${typeof node.value}`;
        value.textContent = StructuredPreviewUtils.formatScalar(node.value);
        row.append(key, value);
        return { element: row, childrenContainer: null, children: [] };
    }

    renderError(content, documentType, error) {
        const wrapper = document.createElement('div');
        wrapper.className = 'structured-error';
        const message = document.createElement('div');
        message.className = 'error';
        const location = error.line ? `（第 ${error.line} 行，第 ${error.column || 1} 列）` : '';
        message.innerHTML = `<h3>解析失败</h3><p></p>`;
        message.querySelector('p').textContent = `${error.message || '无法解析文件'}${location}`;
        wrapper.appendChild(message);
        wrapper.appendChild(this.createSourceFallback(content, documentType, error.line));
        this.container.replaceChildren(wrapper);
    }

    createSourceFallback(content, documentType, errorLine) {
        const pre = document.createElement('pre');
        pre.className = 'structured-source';
        const code = document.createElement('code');
        const language = typeof Prism !== 'undefined' && Prism.languages[documentType] ? documentType : 'text';
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const lineElement = document.createElement('span');
            lineElement.className = `source-line${lineNumber === errorLine ? ' parse-error-line' : ''}`;
            lineElement.dataset.line = String(lineNumber);
            if (language === 'text') {
                lineElement.textContent = line || ' ';
            } else {
                lineElement.innerHTML = Prism.highlight(line || ' ', Prism.languages[language], language);
            }
            code.appendChild(lineElement);
            if (index < lines.length - 1) code.appendChild(document.createTextNode('\n'));
        });
        pre.appendChild(code);
        return pre;
    }
}

window.StructuredPreview = StructuredPreview;
// AIGC END
