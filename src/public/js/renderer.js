class MarkdownRenderer {
    constructor() {
        this.currentBasePath = '';
        this.outlineData = [];
        this.headingCount = 0;
        this.elementCount = 0; // 用于为每个元素生成唯一 ID
        // AIGC START
        this.sourceLines = [];
        this.outlineLineIndex = [];
        this.outlineLinePointer = 0;
        // AIGC END
        this.setupMarked();
        this.setupMermaid();
    }

    setupMarked() {
        if (typeof marked === 'undefined') {
            console.error('marked.js is not loaded');
            return;
        }

        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false, // We handle IDs manually
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });

        const renderer = new marked.Renderer();

        // 生成唯一元素 ID
        const generateElementId = () => {
            return `element-${this.elementCount++}`;
        };

        // 生成评论 UI 的 HTML
        const generateCommentUI = (elementId) => {
            return `
            <div class="comment-section" data-element-id="${elementId}">
                <button class="comment-toggle-btn" data-element-id="${elementId}" title="添加评论">
                    💬 评论
                </button>
                <div class="comments-container" data-element-id="${elementId}">
                    <div class="comments-list" data-element-id="${elementId}"></div>
                    <form class="comment-form" data-element-id="${elementId}">
                        <textarea name="content" placeholder="评论内容" required></textarea>
                        <div class="comment-actions">
                            <button type="submit" class="comment-submit-btn">确认</button>
                            <button type="button" class="comment-cancel-btn">取消</button>
                        </div>
                    </form>
                </div>
            </div>`;
        };

        renderer.heading = (text, level, raw) => {
            const cleanId = raw.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'h';

            const id = `heading-${cleanId}-${this.headingCount++}`;
            const elementId = generateElementId();

            // Use raw text for outline to avoid HTML tags, but maybe we want to strip markdown syntax too?
            // For consistency with previous behavior (which used regex match), raw is close enough.
            // AIGC START
            const line = this.getHeadingLine(raw, level);
            this.outlineData.push({
                level: level,
                text: raw,
                id: id,
                line: line
            });
            // AIGC END

            return `
            <section class="commentable-element" data-element-id="${elementId}" data-heading-id="${id}">
                <h${level} id="${id}">${text}</h${level}>
                ${generateCommentUI(elementId)}
            </section>`;
        };
        
        renderer.code = (code, language) => {
            const elementId = generateElementId();

            if (language === 'mermaid') {
                return `
                <section class="commentable-element" data-element-id="${elementId}">
                    <div class="mermaid">${code}</div>
                    ${generateCommentUI(elementId)}
                </section>`;
            } else if (language === 'plantuml') {
                return `
                <section class="commentable-element" data-element-id="${elementId}">
                    ${this.renderPlantUML(code)}
                    ${generateCommentUI(elementId)}
                </section>`;
            } else {
                const validLang = language && Prism.languages[language] ? language : 'text';
                const highlighted = Prism.highlight(code, Prism.languages[validLang], validLang);
                return `
                <section class="commentable-element" data-element-id="${elementId}">
                    <pre><code class="language-${validLang}">${highlighted}</code></pre>
                    ${generateCommentUI(elementId)}
                </section>`;
            }
        };

        renderer.table = (header, body) => {
            const elementId = generateElementId();
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <div class="table-wrapper"><table class="table"><thead>${header}</thead><tbody>${body}</tbody></table></div>
                ${generateCommentUI(elementId)}
            </section>`;
        };

        // 重写 paragraph 方法
        renderer.paragraph = (text) => {
            const elementId = generateElementId();
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <p>${text}</p>
                ${generateCommentUI(elementId)}
            </section>`;
        };

        // 重写 list 方法
        renderer.list = (body, ordered) => {
            const elementId = generateElementId();
            const tag = ordered ? 'ol' : 'ul';
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <${tag} class="list">${body}</${tag}>
                ${generateCommentUI(elementId)}
            </section>`;
        };

        // 重写 listitem 方法
        renderer.listitem = (text) => {
            return `<li>${text}</li>`;
        };

        // 重写 blockquote 方法
        renderer.blockquote = (quote) => {
            const elementId = generateElementId();
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <blockquote>${quote}</blockquote>
                ${generateCommentUI(elementId)}
            </section>`;
        };

        // 重写 hr 方法
        renderer.hr = () => {
            const elementId = generateElementId();
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <hr>
                ${generateCommentUI(elementId)}
            </section>`;
        };

        // 重写 image 方法
        renderer.image = (href, title, text) => {
            const elementId = generateElementId();
            const titleAttr = title ? ` title="${title}"` : '';
            const src = this.resolveImageSrc(href, this.currentBasePath);
            return `
            <section class="commentable-element" data-element-id="${elementId}">
                <img src="${src}" alt="${text}"${titleAttr} loading="lazy">
                ${generateCommentUI(elementId)}
            </section>`;
        };

        renderer.link = (href, title, text) => {
            const isExternal = href.startsWith('http') && !href.includes(window.location.host);
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
        };

        marked.use({ renderer });
    }

    setupMermaid() {
        if (typeof mermaid === 'undefined') return;
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                darkMode: false,
                primaryColor: '#007bff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#0056b3',
                lineColor: '#6c757d'
            }
        });
    }

    renderPlantUML(code) {
        try {
            const trimmed = code.trim();
            if (!trimmed) return '<div class="plantuml"></div>';
            const encoded = this.encodePlantUML(trimmed);
            const url = 'https://www.plantuml.com/plantuml/svg/' + encoded;
            const encodedSource = encodeURIComponent(trimmed);
            // 存储 encoded 用于在线预览跳转
            return `<div class="plantuml"><img src="${url}" alt="PlantUML Diagram" loading="lazy" class="plantuml-image" data-zoomable="true" data-source="${encodedSource}" data-encoded="${encoded}" data-type="plantuml"></div>`;
        } catch (error) {
            console.error('PlantUML error:', error);
            return `<pre><code>${code}</code></pre>`;
        }
    }

    async renderMermaidDiagrams() {
        if (typeof mermaid === 'undefined') return;
        const mermaidElements = document.querySelectorAll('.mermaid');
        for (const element of mermaidElements) {
            try {
                const graphDefinition = element.textContent;
                const encodedSource = encodeURIComponent(graphDefinition.trim());
                const { svg } = await mermaid.render('mermaid-' + Date.now(), graphDefinition);
                element.innerHTML = svg;
                const svgElement = element.querySelector('svg');
                if (svgElement) {
                    svgElement.setAttribute('data-zoomable', 'true');
                    svgElement.setAttribute('data-source', encodedSource);
                    svgElement.setAttribute('data-type', 'mermaid');
                    svgElement.style.cursor = 'zoom-in';
                }
            } catch (error) {
                console.error('Mermaid error:', error);
            }
        }
    }

    async renderMarkdown(content, basePath) {
        this.currentBasePath = basePath || '';
        // AIGC START
        this.sourceLines = (content || '').split('\n');
        this.outlineLineIndex = this.extractOutlineLineIndex(content || '');
        this.outlineLinePointer = 0;
        // AIGC END
        // AIGC START
        let source = content || '';
        let mathPlaceholders = [];
        if (typeof MarkdownMath !== 'undefined') {
            const protectedMath = MarkdownMath.protectMath(source);
            source = protectedMath.text;
            mathPlaceholders = protectedMath.placeholders;
        }
        const html = await marked.parse(source);
        return typeof MarkdownMath !== 'undefined' ? MarkdownMath.restoreMath(html, mathPlaceholders) : html;
        // AIGC END
    }

    async renderContent(content, options = {}) {
        const { targetId = 'content-body', basePath = '' } = options;
        this.currentBasePath = basePath;

        // Reset counters before parsing
        this.outlineData = [];
        this.headingCount = 0;
        this.elementCount = 0;
        // AIGC START
        this.sourceLines = [];
        this.outlineLineIndex = [];
        this.outlineLinePointer = 0;
        // AIGC END

        const html = await this.renderMarkdown(content, basePath);

        const container = document.getElementById(targetId);
        if (container) {
            container.innerHTML = '';

            const tempDiv = document.createElement('div');
            tempDiv.className = 'markdown-body';
            tempDiv.innerHTML = html;

            container.appendChild(tempDiv);

            await this.renderMermaidDiagrams();
            // AIGC START
            if (typeof MarkdownMath !== 'undefined') {
                MarkdownMath.renderMath(tempDiv);
            }
            // AIGC END
            Prism.highlightAllUnder(tempDiv);
            this.setupImageZoom(container);
        }

        return this.outlineData;
    }

    // AIGC START
    extractOutlineLineIndex(content) {
        const outline = [];
        const lines = (content || '').split('\n');
        let inFence = false;
        let fenceMarker = null;
        let inIndent = false;
        let prevLineIndented = false;
        let prevLineIsBox = false;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];

            const isIndented = /^ {4,}\S|^\t/.test(rawLine);
            let isCurrentIndentedBlock = false;

            if (inIndent) {
                if (isIndented || rawLine.trim() === '') {
                    isCurrentIndentedBlock = true;
                } else {
                    inIndent = false;
                }
            }
            if (!inFence && !inIndent && isIndented) {
                inIndent = true;
                isCurrentIndentedBlock = true;
            }

            const isBox = /^[─-╿]/.test(rawLine.trim());
            const fenceMatch = rawLine.match(/^\s*(```+|~~~+)/);
            let isFence = false;

            if (fenceMatch) {
                const marker = fenceMatch[1];
                const fenceIndent = fenceMatch[0].indexOf(marker);
                const restOfLine = rawLine.substring(fenceMatch[0].length).trim();

                const isClosing = inFence &&
                    fenceMarker &&
                    marker.startsWith(fenceMarker[0]) &&
                    marker.length >= fenceMarker.length &&
                    restOfLine === '';

                if (isClosing) {
                    inFence = false;
                    fenceMarker = null;
                    isFence = true;
                } else {
                    if (!inFence && (prevLineIndented || prevLineIsBox) && fenceIndent < 4) {
                        isFence = false;
                    } else {
                        if (!inFence) {
                            inFence = true;
                            fenceMarker = marker;
                            isFence = true;
                        } else {
                            isFence = false;
                        }
                    }
                }
            }

            if (rawLine.trim() !== '') {
                prevLineIndented = isCurrentIndentedBlock;
                prevLineIsBox = isBox;
            }

            if (isCurrentIndentedBlock) continue;
            if (isFence) continue;
            if (inFence) continue;

            const line = rawLine.trim();
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                outline.push({ level, text, line: i });
            }
        }

        return outline;
    }

    getHeadingLine(rawText, level) {
        if (!this.outlineLineIndex.length) {
            return null;
        }
        const normalizedText = typeof rawText === 'string' ? rawText.trim() : '';
        for (let i = this.outlineLinePointer; i < this.outlineLineIndex.length; i++) {
            const candidate = this.outlineLineIndex[i];
            if (candidate.level === level && candidate.text === normalizedText) {
                this.outlineLinePointer = i + 1;
                return candidate.line;
            }
        }
        return null;
    }
    // AIGC END

    setupImageZoom(container) {
        let modal = document.getElementById('image-zoom-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'image-zoom-modal';
        modal.className = 'image-zoom-modal';
        modal.innerHTML = `
            <div class="image-zoom-content">
                <div class="image-zoom-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 20px; background:var(--bg-secondary); border-bottom:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="image-zoom-title" style="font-weight:600;">图片预览</span>
                        <button class="view-source-btn" style="display:none; padding:4px 12px; cursor:pointer; background:var(--accent-color); color:white; border:none; border-radius:4px; font-size:12px;">转换代码</button>
                        <button class="online-preview-btn" style="display:none; padding:4px 12px; cursor:pointer; background:#4caf50; color:white; border:none; border-radius:4px; font-size:12px;">在线预览</button>
                    </div>
                    <button class="image-zoom-close" title="关闭" style="background:none; border:none; font-size:20px; cursor:pointer; color:var(--text-secondary);">✕</button>
                </div>
                <div class="image-zoom-body" style="flex:1; position:relative; overflow:hidden; background:var(--bg-primary); display:flex; align-items:center; justify-content:center;">
                    <img src="" alt="放大预览" style="max-width:none; max-height:none; transition:none; cursor:grab; user-select:none;">
                    <div class="zoom-svg-container" style="display:none; cursor:grab; user-select:none;"></div>
                    <div class="source-viewer" style="display:none; position:absolute; inset:0; background:var(--bg-primary); padding:30px; overflow:auto; flex-direction:column; z-index:10;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <strong style="font-size:14px; color:var(--text-primary);">公式源码:</strong>
                            <button class="copy-source-btn" style="padding:4px 12px; cursor:pointer; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; font-size:12px; color:var(--text-primary);">复制全部</button>
                        </div>
                        <pre style="margin:0; white-space:pre-wrap; word-break:break-all; font-family:monospace; font-size:14px; line-height:1.5; flex:1; padding:20px; background:var(--bg-secondary); border-radius:6px; border:1px solid var(--border-color); color:var(--text-primary);"></pre>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.imageClickHandler = (e) => {
            const target = e.target.closest('img, svg');
            if (target && target.getAttribute('data-zoomable') === 'true') {
                e.preventDefault();
                e.stopPropagation();
                let src = '';
                let originalSvg = null;
                const tagName = target.tagName.toLowerCase();
                if (tagName === 'img') {
                    src = target.src;
                } else if (tagName === 'svg') {
                    // Mermaid SVG 含 foreignObject，不能通过 img 标签加载，
                    // 直接传递原始 SVG 元素引用
                    originalSvg = target;
                }
                const source = target.getAttribute('data-source');
                const type = target.getAttribute('data-type');
                const encoded = target.getAttribute('data-encoded');
                this.showImageZoom(src, target.alt || '图片预览', source, type, encoded, originalSvg);
            }
        };

        container.addEventListener('click', this.imageClickHandler);
        modal.querySelector('.image-zoom-close').onclick = () => this.hideImageZoom();
        
        container.querySelectorAll('img[data-zoomable="true"], svg[data-zoomable="true"]').forEach(el => {
            el.style.cursor = 'zoom-in';
        });
    }

    showImageZoom(src, alt, source, type, encoded, originalSvgElement) {
        const modal = document.getElementById('image-zoom-modal');
        const img = modal.querySelector('.image-zoom-body img');
        const svgContainer = modal.querySelector('.zoom-svg-container');
        const body = modal.querySelector('.image-zoom-body');
        const sourceBtn = modal.querySelector('.view-source-btn');
        const onlineBtn = modal.querySelector('.online-preview-btn');
        const sourceViewer = modal.querySelector('.source-viewer');
        const pre = sourceViewer.querySelector('pre');
        const copyBtn = sourceViewer.querySelector('.copy-source-btn');

        const isMermaid = !!(originalSvgElement && type === 'mermaid');

        img.alt = alt;
        sourceViewer.style.display = 'none';
        sourceBtn.textContent = '转换代码';
        sourceBtn.style.background = 'var(--accent-color)';

        if (source) {
            sourceBtn.style.display = 'block';
            const decodedSource = decodeURIComponent(source);
            pre.textContent = decodedSource;
            sourceBtn.onclick = (e) => {
                e.stopPropagation();
                const isShowing = sourceViewer.style.display === 'flex';
                sourceViewer.style.display = isShowing ? 'none' : 'flex';
                sourceBtn.textContent = isShowing ? '转换代码' : '返回预览';
                sourceBtn.style.background = isShowing ? 'var(--accent-color)' : 'var(--text-secondary)';
            };
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                this.copyToClipboard(decodedSource);
                copyBtn.textContent = '已复制!';
                setTimeout(() => { copyBtn.textContent = '复制全部'; }, 2000);
            };
        } else {
            sourceBtn.style.display = 'none';
        }

        // 处理在线预览按钮 (仅限 PlantUML)
        if (type === 'plantuml' && encoded) {
            onlineBtn.style.display = 'block';
            onlineBtn.onclick = (e) => {
                e.stopPropagation();
                window.open('https://www.plantuml.com/plantuml/uml/' + encoded, '_blank');
            };
        } else {
            onlineBtn.style.display = 'none';
        }

        // 清理旧内容
        const oldSpinner = body.querySelector('.zoom-loading-spinner');
        if (oldSpinner) oldSpinner.remove();
        const oldError = body.querySelector('.zoom-error-msg');
        if (oldError) oldError.remove();
        svgContainer.innerHTML = '';
        svgContainer.style.display = 'none';

        let zoomTarget; // 缩放/拖拽的目标元素（img 或 svgContainer）
        let scale = 1, translateX = 0, translateY = 0, isDragging = false, startX = 0, startY = 0;

        const updateTransform = () => {
            zoomTarget.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        if (isMermaid) {
            // Mermaid SVG 包含 foreignObject，不能通过 <img> 加载，
            // 直接克隆 SVG 到弹窗 DOM 中显示
            img.style.display = 'none';
            const clonedSvg = originalSvgElement.cloneNode(true);
            clonedSvg.removeAttribute('style');
            clonedSvg.removeAttribute('data-zoomable');
            clonedSvg.removeAttribute('data-source');
            clonedSvg.removeAttribute('data-type');
            svgContainer.appendChild(clonedSvg);
            svgContainer.style.display = 'block';
            zoomTarget = svgContainer;

            // 根据 SVG viewBox 计算初始缩放比例
            const viewBox = clonedSvg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+/);
                const vbW = parseFloat(parts[2]), vbH = parseFloat(parts[3]);
                if (vbW > 0 && vbH > 0) {
                    const winW = window.innerWidth * 0.9, winH = window.innerHeight * 0.8;
                    scale = (vbW > winW || vbH > winH)
                        ? Math.min(winW / vbW, winH / vbH) : 1;
                }
            }
            translateX = 0; translateY = 0;
            updateTransform();
        } else {
            // PlantUML 或普通图片：使用 img 标签加载
            svgContainer.style.display = 'none';
            zoomTarget = img;

            // 创建加载中 spinner
            const spinner = document.createElement('div');
            spinner.className = 'zoom-loading-spinner';
            spinner.innerHTML = `
                <div style="
                    width:40px; height:40px;
                    border:4px solid var(--border-color, #e0e0e0);
                    border-top-color: var(--accent-color, #007bff);
                    border-radius:50%;
                    animation: zoom-spin 0.8s linear infinite;
                    margin-bottom:12px;
                "></div>
                <span style="color:var(--text-secondary, #666); font-size:14px;">加载中...</span>
            `;
            Object.assign(spinner.style, {
                position: 'absolute', inset: '0',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)', zIndex: '5'
            });
            if (!document.getElementById('zoom-spinner-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'zoom-spinner-style';
                styleEl.textContent = '@keyframes zoom-spin { to { transform: rotate(360deg); } }';
                document.head.appendChild(styleEl);
            }
            body.appendChild(spinner);

            const handleImageLoaded = () => {
                spinner.remove();
                const errEl = body.querySelector('.zoom-error-msg');
                if (errEl) errEl.remove();
                img.style.display = 'block';
                const winW = window.innerWidth * 0.9, winH = window.innerHeight * 0.8;
                scale = (img.naturalWidth > winW || img.naturalHeight > winH)
                    ? Math.min(winW / img.naturalWidth, winH / img.naturalHeight) : 1;
                translateX = 0; translateY = 0;
                updateTransform();
            };

            img.onload = handleImageLoaded;

            img.onerror = () => {
                spinner.remove();
                img.style.display = 'none';
                const errEl = body.querySelector('.zoom-error-msg');
                if (errEl) errEl.remove();
                const errorDiv = document.createElement('div');
                errorDiv.className = 'zoom-error-msg';
                errorDiv.textContent = '⚠️ 图片加载失败，请检查网络连接或点击"在线预览"查看';
                Object.assign(errorDiv.style, {
                    position: 'absolute', inset: '0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary, #999)', fontSize: '14px',
                    zIndex: '5'
                });
                body.appendChild(errorDiv);
            };

            img.style.display = 'none';
            img.src = src;

            if (img.complete && img.naturalWidth > 0) {
                handleImageLoaded();
            }
        }

        // 统一拖拽/缩放事件（作用于 zoomTarget）
        zoomTarget.onmousedown = (e) => {
            if (e.button !== 0 || sourceViewer.style.display === 'flex') return;
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            zoomTarget.style.cursor = 'grabbing';
            e.preventDefault();
        };

        window.onmousemove = (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        };

        window.onmouseup = () => {
            isDragging = false;
            zoomTarget.style.cursor = 'grab';
        };

        modal.onwheel = (e) => {
            if (sourceViewer.style.display === 'flex') return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const nextScale = Math.min(Math.max(0.1, scale + delta), 10);
            if (nextScale !== scale) {
                const mouseX = e.clientX - window.innerWidth / 2;
                const mouseY = e.clientY - window.innerHeight / 2;
                const imagePointX = (mouseX - translateX) / scale;
                const imagePointY = (mouseY - translateY) / scale;
                scale = nextScale;
                translateX = mouseX - imagePointX * scale;
                translateY = mouseY - imagePointY * scale;
                updateTransform();
            }
        };

        zoomTarget.style.transform = 'translate(0, 0) scale(1)';
        zoomTarget.style.cursor = 'grab';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideImageZoom() {
        const modal = document.getElementById('image-zoom-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('代码已复制到剪贴板');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text; document.body.appendChild(textarea);
            textarea.select(); document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification('代码已复制到剪贴板');
        });
    }

    showNotification(message) {
        const existing = document.querySelector('.code-focus-notification');
        if (existing) existing.remove();
        const notification = document.createElement('div');
        notification.className = 'code-focus-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    encodePlantUML(text) {
        if (typeof plantumlEncoder !== 'undefined') return plantumlEncoder.encode(text);
        return this.encodePlantUMLFallback(text);
    }

    encodePlantUMLFallback(text) {
        const utf8 = new TextEncoder().encode(text);
        const encode6bit = (b) => {
            if (b < 10) return String.fromCharCode(48 + b); 
            if (b < 36) return String.fromCharCode(55 + b);
            if (b < 62) return String.fromCharCode(61 + b);
            if (b === 62) return '-'; return '_';
        };
        const append3bytes = (b1, b2, b3) => {
            const c1 = b1 >> 2, c2 = ((b1 & 0x3) << 4) | (b2 >> 4), c3 = ((b2 & 0xF) << 2) | (b3 >> 6), c4 = b3 & 0x3F;
            return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F);
        };
        let out = '';
        for (let i = 0; i < utf8.length; i += 3) out += append3bytes(utf8[i], utf8[i+1] || 0, utf8[i+2] || 0);
        return out;
    }

    resolveImageSrc(href, basePath) {
        if (!href || href.startsWith('#') || /^(data:|blob:|http:\/\/|https:\/\/|\/\/)/.test(href.toLowerCase())) return href;
        const parts = (basePath || '').split('/'); parts.pop();
        const stack = parts.concat(href.split('/')).filter(p => p && p !== '.');
        const final = [];
        for (const p of stack) { if (p === '..') final.pop(); else final.push(p); }
        return `/workspace/${final.join('/')}`;
    }
}

window.MarkdownRenderer = MarkdownRenderer;
